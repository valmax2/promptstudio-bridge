package com.aicreator.offline.domain.conditioning

import com.aicreator.offline.domain.model.CharacterMode

/**
 * Esito della validazione/preparazione di un condizionamento personaggio,
 * prima di passarlo (quando un motore lo supporterà davvero) a
 * [com.aicreator.offline.domain.engine.InferenceEngine].
 */
sealed interface ConditioningPlan {
    data class Ready(
        val technique: String,
        val referenceImagePath: String,
        val strength: Float,
        val faceStrength: Float,
    ) : ConditioningPlan

    data class Rejected(val reason: String) : ConditioningPlan
}

/**
 * Modulo sostituibile per la coerenza del personaggio. Ogni implementazione
 * dichiara la tecnica di riferimento (vedi docs/FEASIBILITY.md §3 per quali
 * sono realistiche su smartphone: IP-Adapter-style è l'unica scelta per la
 * prima versione; InstantID/PuLID restano moduli futuri collegabili qui).
 *
 * Nota importante: nessuna implementazione qui applica ancora davvero il
 * condizionamento a un motore di inferenza (vedi
 * [com.aicreator.offline.domain.engine.EngineCapabilities.supportsFaceConditioning]
 * / `supportsFullBodyConditioning`, entrambi `false` per il motore MediaPipe
 * in questa versione). I moduli validano l'input e producono un piano
 * esplicito, così l'infrastruttura è pronta per essere collegata al motore
 * non appena la wiring reale sarà verificata (docs/TODO.md punto 4), senza
 * dover riscrivere UI o use case.
 */
interface CharacterConditioningModule {
    val mode: CharacterMode
    val techniqueDescription: String

    fun plan(referenceImagePath: String?, strength: Float, faceStrength: Float): ConditioningPlan
}

class FaceConditioningModule : CharacterConditioningModule {
    override val mode = CharacterMode.PORTRAIT
    override val techniqueDescription =
        "IP-Adapter-style leggero sul volto (embedding immagine di riferimento). " +
            "Tecnica più leggera compatibile con smartphone, vedi docs/FEASIBILITY.md."

    override fun plan(referenceImagePath: String?, strength: Float, faceStrength: Float): ConditioningPlan {
        if (referenceImagePath.isNullOrBlank()) {
            return ConditioningPlan.Rejected("Carica una foto di riferimento del volto per usare questa modalità.")
        }
        if (strength !in 0f..1f || faceStrength !in 0f..1f) {
            return ConditioningPlan.Rejected("Intensità non valida.")
        }
        return ConditioningPlan.Ready(
            technique = "ip-adapter-face-light",
            referenceImagePath = referenceImagePath,
            strength = strength,
            faceStrength = faceStrength,
        )
    }
}

class FullBodyConditioningModule : CharacterConditioningModule {
    override val mode = CharacterMode.FULL_BODY
    override val techniqueDescription =
        "IP-Adapter-style esteso a corporatura/abbigliamento, con eventuale ControlNet-light " +
            "per la posa quando il modello importato lo supporta. Più pesante della modalità volto: " +
            "richiede il profilo Bilanciato o Realistico, vedi docs/FEASIBILITY.md."

    override fun plan(referenceImagePath: String?, strength: Float, faceStrength: Float): ConditioningPlan {
        if (referenceImagePath.isNullOrBlank()) {
            return ConditioningPlan.Rejected("Carica una foto di riferimento a figura intera per usare questa modalità.")
        }
        if (strength !in 0f..1f || faceStrength !in 0f..1f) {
            return ConditioningPlan.Rejected("Intensità non valida.")
        }
        return ConditioningPlan.Ready(
            technique = "ip-adapter-fullbody-light",
            referenceImagePath = referenceImagePath,
            strength = strength,
            faceStrength = faceStrength,
        )
    }
}
