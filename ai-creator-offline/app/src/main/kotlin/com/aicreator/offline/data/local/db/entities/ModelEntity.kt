package com.aicreator.offline.data.local.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "models")
data class ModelEntity(
    @PrimaryKey val id: String,
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
)
