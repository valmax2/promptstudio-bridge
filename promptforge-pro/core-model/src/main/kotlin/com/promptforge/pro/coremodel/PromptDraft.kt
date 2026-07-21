package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

/**
 * Testo sorgente in italiano più traduzione inglese modificabile (§4). Le due
 * versioni convivono sempre: l'utente può modificare l'inglese senza perdere
 * l'italiano originale, e una nuova dettatura/traduzione non deve sovrascrivere
 * modifiche manuali già fatte (regola imposta a livello di ViewModel, non qui).
 */
@Serializable
data class PromptDraft(
    val italianText: String = "",
    val englishText: String = "",
    val englishManuallyEdited: Boolean = false,
    val subjectMode: SubjectMode = SubjectMode.Single,
    val schemaVersion: Int = 1,
)

@Serializable
data class PromptRequest(
    val draft: PromptDraft,
    val characterReferences: List<CharacterReferenceConfig> = emptyList(),
    val visualStyle: VisualStyle = VisualStyle.Photorealistic,
    val mood: String = "",
    val detailIntensity: Float = 0.6f,
    /**
     * Posa scelta dall'utente nella UI. L'azione rilevata nel testo ha però
     * sempre la priorità su questa (§7: "priorità all'azione del testo
     * rispetto a una posa UI incompatibile") — vedi PoseDetector in prompt-engine.
     */
    val selectedPose: String? = null,
    val adultMode: AdultModeConfig = AdultModeConfig(),
    val directorMap: DirectorMapState = DirectorMapState.Default,
    val camera: CameraConfig = CameraConfig(),
    val lighting: LightingConfig = LightingConfig(),
    val environment: EnvironmentConfig = EnvironmentConfig(),
    val negativePrompt: NegativePromptConfig = NegativePromptConfig(),
    val output: OutputConfig = OutputConfig(),
    val schemaVersion: Int = 1,
) {
    init {
        require(detailIntensity in 0f..1f) { "detailIntensity fuori range 0..1: $detailIntensity" }
    }
}

@Serializable
data class GeneratedPrompt(
    val id: String,
    val requestId: String,
    val variantIndex: Int,
    val positivePrompt: String,
    val negativePrompt: String,
    val seedUsed: Long,
    val createdAtEpochMillis: Long,
    val schemaVersion: Int = 1,
)
