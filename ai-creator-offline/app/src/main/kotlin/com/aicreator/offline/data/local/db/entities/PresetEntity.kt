package com.aicreator.offline.data.local.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "presets")
data class PresetEntity(
    @PrimaryKey val id: String,
    val name: String,
    val positivePrompt: String,
    val negativePrompt: String,
    val translatePromptToEnglish: Boolean,
    val seed: Long?,
    val steps: Int,
    val cfgScale: Float,
    val scheduler: String,
    val width: Int,
    val height: Int,
    val modelId: String,
    val loraIdsCsv: String,
    val referenceImageUri: String?,
    val referenceStrength: Float,
    val faceConsistencyStrength: Float,
    val characterMode: String?,
    val upscale: Boolean,
    val createdAt: Long,
)
