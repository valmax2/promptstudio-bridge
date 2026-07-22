package com.aicreator.offline.domain.model

/**
 * Rappresentazione tipizzata di `manifest.json` dentro un pacchetto modello
 * (vedi docs/MODEL_CONVERSION.md). Parsata da
 * [com.aicreator.offline.data.local.files.ModelPackageReader] usando
 * `org.json` (già incluso in Android, nessuna dipendenza aggiuntiva).
 */
data class ModelManifest(
    val id: String,
    val displayName: String,
    val version: String,
    val engine: String,
    val sizeBytes: Long,
    val minRamMb: Int,
    val recommendedResolution: Int,
    val maxSteps: Int,
    val checksumSha256: String,
    val license: String?,
    val supportsLora: Boolean,
    val notes: String?,
)

data class LoraManifest(
    val id: String,
    val displayName: String,
    val baseModelId: String,
    val sizeBytes: Long,
    val checksumSha256: String,
)
