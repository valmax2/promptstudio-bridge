package com.aicreator.offline.data.local.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "loras")
data class LoraEntity(
    @PrimaryKey val id: String,
    val displayName: String,
    val baseModelId: String,
    val localPath: String,
    val sizeBytes: Long,
    val checksumSha256: String,
    val isEnabled: Boolean,
    val importedAt: Long,
)
