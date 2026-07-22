package com.aicreator.offline.domain.model

data class HistoryEntry(
    val id: String,
    val params: GenerationParams,
    val resultImagePath: String?,
    val status: GenerationStatus,
    val errorMessage: String?,
    val durationMs: Long,
    val createdAt: Long,
    val isFavorite: Boolean,
)
