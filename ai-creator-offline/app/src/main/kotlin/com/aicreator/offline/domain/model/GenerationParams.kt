package com.aicreator.offline.domain.model

/**
 * Scheduler di campionamento supportati. L'insieme effettivamente disponibile
 * per un dato modello dipende dal motore di inferenza (vedi [InferenceEngine]);
 * l'UI filtra le opzioni in base a [com.aicreator.offline.domain.engine.EngineCapabilities].
 */
enum class SchedulerType(val label: String) {
    EULER_ANCESTRAL("Euler a"),
    DPM_SOLVER_PP("DPM++ 2M"),
    DDIM("DDIM"),
    LCM("LCM (pochi passi)"),
}

enum class CharacterMode {
    PORTRAIT,
    FULL_BODY,
}

enum class AspectRatio(val width: Int, val height: Int, val label: String) {
    SQUARE(1, 1, "1:1"),
    PORTRAIT_3_4(3, 4, "3:4"),
    LANDSCAPE_4_3(4, 3, "4:3"),
    PORTRAIT_9_16(9, 16, "9:16"),
    LANDSCAPE_16_9(16, 9, "16:9"),
}

/**
 * Tutti i parametri necessari per avviare una generazione. Immutabile: ogni
 * modifica dalla UI produce una nuova istanza (pattern standard per
 * StateFlow/Compose).
 */
data class GenerationParams(
    val positivePrompt: String,
    val negativePrompt: String = "",
    val translatePromptToEnglish: Boolean = false,
    val seed: Long? = null,
    val steps: Int = 20,
    val cfgScale: Float = 7.0f,
    val scheduler: SchedulerType = SchedulerType.EULER_ANCESTRAL,
    val width: Int = 512,
    val height: Int = 512,
    val modelId: String,
    val loraIds: List<String> = emptyList(),
    val referenceImageUri: String? = null,
    val referenceStrength: Float = 0.5f,
    val faceConsistencyStrength: Float = 0.5f,
    val characterMode: CharacterMode? = null,
    val upscale: Boolean = false,
) {
    init {
        require(positivePrompt.isNotBlank()) { "Il prompt positivo non può essere vuoto" }
        require(steps in 1..75) { "Passi fuori intervallo consentito (1-75)" }
        require(cfgScale in 1f..20f) { "CFG fuori intervallo consentito (1-20)" }
        require(width in 64..2048 && height in 64..2048) { "Risoluzione non valida" }
        require(referenceStrength in 0f..1f) { "Intensità riferimento fuori intervallo" }
        require(faceConsistencyStrength in 0f..1f) { "Intensità coerenza volto fuori intervallo" }
    }

    val effectiveSeed: Long
        get() = seed ?: (System.nanoTime() xor System.currentTimeMillis())
}
