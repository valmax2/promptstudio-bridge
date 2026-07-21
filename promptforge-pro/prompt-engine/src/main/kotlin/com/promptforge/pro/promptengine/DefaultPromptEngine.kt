package com.promptforge.pro.promptengine

import com.promptforge.pro.coremodel.CameraMovement
import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coremodel.NegativePromptConfig
import com.promptforge.pro.coremodel.OutputConfig
import com.promptforge.pro.coremodel.PromptRequest
import com.promptforge.pro.coremodel.RelativeSubjectView
import com.promptforge.pro.coremodel.TargetModel

/**
 * Implementazione di riferimento del [PromptEngine]. Vedi §7 del master
 * prompt per l'ordine dei segmenti; i numeri nei commenti si riferiscono a
 * "Ordine consigliato del prompt".
 *
 * Nota di design: il punto 2 dell'ordine ("vincolo di coerenza con la scena
 * sorgente") non produce un segmento di testo — sarebbe rumore per un
 * modello di diffusione, che legge liste di keyword, non istruzioni
 * narrative. È invece un invariante dell'algoritmo: il testo sorgente
 * (soggetto+azione) non viene mai riscritto o alterato tra le varianti,
 * solo circondato da altri segmenti. I test verificano questo invariante.
 */
class DefaultPromptEngine(
    private val clockMillis: () -> Long = System::currentTimeMillis,
) : PromptEngine {

    override fun generate(request: PromptRequest): List<GeneratedPrompt> {
        val requestId = fingerprint(request)
        val baseSeed = request.output.seed ?: stableSeedFrom(request.draft.englishText)
        val negativePrompt = buildNegativePrompt(request.negativePrompt)
        val now = clockMillis()

        return (0 until request.output.variantCount).map { variantIndex ->
            val seedUsed = baseSeed + variantIndex
            GeneratedPrompt(
                id = "${requestId}_v$variantIndex",
                requestId = requestId,
                variantIndex = variantIndex,
                positivePrompt = buildPositivePrompt(request, variantIndex, seedUsed),
                negativePrompt = negativePrompt,
                seedUsed = seedUsed,
                createdAtEpochMillis = now,
            )
        }
    }

    private fun buildPositivePrompt(request: PromptRequest, variantIndex: Int, seedUsed: Long): String {
        val segments = listOf(
            subjectAndAction(request),      // 1
            characterConsistency(request),  // 3 (adult token §4 intenzionalmente omesso)
            styleAndMood(request),          // 5
            pose(request),                  // 6
            cameraAndComposition(request),  // 7
            lensAndDepthOfField(request),   // 8
            lighting(request),              // 9
            environmentAndGrading(request), // 10
            variantAccent(request, variantIndex, seedUsed - variantIndex), // 11 (baseSeed, non seedUsed)
            modelSyntax(request.output, seedUsed),          // 12
        )
        return segments.filter { it.isNotBlank() }.joinToString(", ")
    }

    private fun subjectAndAction(request: PromptRequest): String = request.draft.englishText.trim()

    private fun characterConsistency(request: PromptRequest): String {
        val names = request.characterReferences.map { it.characterName }.filter { it.isNotBlank() }
        if (names.isEmpty()) return ""
        return "consistent character identity: ${names.joinToString(", ")}"
    }

    private fun styleAndMood(request: PromptRequest): String {
        val style = humanizeEnum(request.visualStyle.name)
        return if (request.mood.isBlank()) style else "$style, mood: ${request.mood.trim()}"
    }

    private fun pose(request: PromptRequest): String =
        PoseDetector.detect(request.draft.italianText)
            ?: request.selectedPose?.takeIf { it.isNotBlank() }
            ?: "natural relaxed pose"

    private fun cameraAndComposition(request: PromptRequest): String {
        val map = request.directorMap
        return "${humanizeView(map.relativeView)} view, ${humanizeMovement(map.movement)}"
    }

    private fun lensAndDepthOfField(request: PromptRequest): String {
        val camera = request.camera
        return "${camera.lensMillimeters}mm lens, ${humanizeEnum(camera.depthOfField.name)} depth of field"
    }

    private fun lighting(request: PromptRequest): String {
        val lighting = request.lighting
        return listOf(lighting.style, lighting.timeOfDay).filter { it.isNotBlank() }.joinToString(", ")
    }

    private fun environmentAndGrading(request: PromptRequest): String {
        val env = request.environment
        return listOf(env.setting, env.weather, env.colorGrading, env.filmStock)
            .filter { it.isNotBlank() }
            .joinToString(", ")
    }

    private fun variantAccent(request: PromptRequest, variantIndex: Int, seedUsed: Long): String {
        val text = request.draft.englishText
        return listOf(
            pickDeterministic(VariantLexicon.visualRhythm, text, seedUsed, variantIndex, salt = 1),
            pickDeterministic(VariantLexicon.microDetails, text, seedUsed, variantIndex, salt = 2),
            pickDeterministic(VariantLexicon.atmosphere, text, seedUsed, variantIndex, salt = 3),
            pickDeterministic(VariantLexicon.perspective, text, seedUsed, variantIndex, salt = 4),
            pickDeterministic(VariantLexicon.editorialDirection, text, seedUsed, variantIndex, salt = 5),
        ).joinToString(", ")
    }

    private fun modelSyntax(output: OutputConfig, seedUsed: Long): String = when (output.targetModel) {
        TargetModel.Midjourney -> "${output.quality} --ar ${output.aspectRatio} --seed $seedUsed"
        else -> output.quality
    }

    private fun buildNegativePrompt(config: NegativePromptConfig): String =
        (NegativePromptConfig.BaseTerms + config.customTerms).distinct().joinToString(", ")

    private fun humanizeEnum(name: String): String =
        name.replace(Regex("(?<=[a-z])(?=[A-Z])"), " ").lowercase()

    private fun humanizeView(view: RelativeSubjectView): String = when (view) {
        RelativeSubjectView.Front -> "front"
        RelativeSubjectView.ThreeQuarter -> "three-quarter"
        RelativeSubjectView.Profile -> "profile"
        RelativeSubjectView.Back -> "back"
    }

    private fun humanizeMovement(movement: CameraMovement): String = when (movement) {
        CameraMovement.Static -> "static shot"
        CameraMovement.Dolly -> "dolly shot"
        CameraMovement.Pan -> "panning shot"
        CameraMovement.Tilt -> "tilting shot"
        CameraMovement.Crane -> "crane shot"
        CameraMovement.Orbit -> "orbiting shot"
        CameraMovement.Tracking -> "tracking shot"
        CameraMovement.WhipPan -> "whip pan shot"
        CameraMovement.Handheld -> "handheld shot"
        CameraMovement.Steadicam -> "steadicam shot"
        CameraMovement.Drone -> "drone shot"
        CameraMovement.DollyZoom -> "dolly zoom shot"
    }

    private fun pickDeterministic(
        bank: List<String>,
        text: String,
        baseSeed: Long,
        variantIndex: Int,
        salt: Int,
    ): String {
        // Combina i quattro fattori con XOR/shift (non addizione) e passa il
        // risultato in un avalanche hash (SplitMix64) prima del modulo: una
        // combinazione lineare qui produceva incrementi multipli della
        // dimensione delle banche (4), annullando la variazione tra varianti.
        val combined = baseSeed xor
            (text.hashCode().toLong() shl 32) xor
            (variantIndex.toLong() shl 16) xor
            salt.toLong()
        val mixed = avalanche(combined)
        val index = ((mixed % bank.size) + bank.size) % bank.size
        return bank[index.toInt()]
    }

    /** Finalizer di SplitMix64: buona diffusione bit-a-bit, evita cancellazioni lineari. */
    private fun avalanche(input: Long): Long {
        var z = input + GOLDEN_GAMMA
        z = (z xor (z ushr 30)) * MIX_MULTIPLIER_1
        z = (z xor (z ushr 27)) * MIX_MULTIPLIER_2
        return z xor (z ushr 31)
    }

    private companion object {
        val GOLDEN_GAMMA = 0x9E3779B97F4A7C15UL.toLong()
        val MIX_MULTIPLIER_1 = 0xBF58476D1CE4E5B9UL.toLong()
        val MIX_MULTIPLIER_2 = 0x94D049BB133111EBUL.toLong()
    }

    private fun stableSeedFrom(text: String): Long = text.hashCode().toLong() and 0x7FFFFFFF

    private fun fingerprint(request: PromptRequest): String = "req_${request.hashCode().toString(16).removePrefix("-")}"
}
