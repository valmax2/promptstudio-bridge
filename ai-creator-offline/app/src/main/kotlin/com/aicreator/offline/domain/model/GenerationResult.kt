package com.aicreator.offline.domain.model

/**
 * Metadati di generazione salvati accanto a ogni immagine (richiesto:
 * "Visualizzazione dei metadati di generazione" e "riutilizzare le
 * impostazioni di un'immagine precedente"). Non contiene percorsi assoluti
 * del filesystem dell'utente al di fuori della sandbox privata dell'app.
 */
data class GenerationMetadata(
    val params: GenerationParams,
    val engineId: String,
    val engineVersion: String,
    val actualSeed: Long,
    val durationMs: Long,
    val generatedAt: Long,
)

sealed interface GenerationResult {
    data class Success(
        val imagePath: String,
        val metadata: GenerationMetadata,
    ) : GenerationResult

    data object Cancelled : GenerationResult

    /**
     * [userMessage] è sempre in italiano e comprensibile ("memoria insufficiente",
     * "modello non caricato", ecc.). [technicalDetail] è per la diagnostica interna
     * e non deve mai finire in un log persistente (vedi PrivacyLogger).
     */
    data class Error(
        val userMessage: String,
        val technicalDetail: String? = null,
        val cause: Throwable? = null,
    ) : GenerationResult
}

/**
 * Avanzamento emesso durante la generazione per aggiornare la UI
 * (barra di progresso, stima, pulsante Interrompi).
 */
data class GenerationProgress(
    val requestId: String,
    val currentStep: Int,
    val totalSteps: Int,
    val previewImagePath: String? = null,
) {
    val fraction: Float
        get() = if (totalSteps <= 0) 0f else (currentStep.toFloat() / totalSteps).coerceIn(0f, 1f)
}
