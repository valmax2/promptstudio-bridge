package com.aicreator.offline.domain.model

/**
 * Un modello AI importato dall'utente. [sourceFolderUri] è l'URI SAF
 * (content://...) da cui è stato importato, conservato solo a scopo
 * informativo. [localPath] è il percorso assoluto nello storage privato
 * dell'app dove il pacchetto è stato copiato e verificato dal Model Manager:
 * è l'unico percorso che i motori di inferenza devono usare per caricare i
 * pesi, perché MediaPipe (e la maggior parte dei runtime nativi) richiede un
 * percorso filesystem reale, non un content:// URI.
 */
data class AiModel(
    val id: String,
    val displayName: String,
    val engine: String,
    val sourceFolderUri: String,
    val localPath: String,
    val sizeBytes: Long,
    val minRamMb: Int,
    val recommendedResolution: Int,
    val maxSteps: Int,
    val checksumSha256: String,
    val license: String?,
    val supportsLora: Boolean,
    val isActive: Boolean,
    val importedAt: Long,
) {
    /** Stima di compatibilità con il dispositivo corrente, calcolata dal chiamante. */
    enum class Compatibility { COMPATIBLE, MARGINALE, INCOMPATIBILE }
}
