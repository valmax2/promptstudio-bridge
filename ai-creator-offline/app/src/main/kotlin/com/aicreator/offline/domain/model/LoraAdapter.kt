package com.aicreator.offline.domain.model

data class LoraAdapter(
    val id: String,
    val displayName: String,
    val baseModelId: String,
    /** Percorso assoluto del file di pesi LoRA nello storage privato dell'app (vedi AiModel.localPath). */
    val localPath: String,
    val sizeBytes: Long,
    val checksumSha256: String,
    val isEnabled: Boolean,
    val importedAt: Long,
)
