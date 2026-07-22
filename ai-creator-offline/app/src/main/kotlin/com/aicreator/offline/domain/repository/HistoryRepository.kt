package com.aicreator.offline.domain.repository

import com.aicreator.offline.domain.model.GenerationMetadata
import com.aicreator.offline.domain.model.GenerationParams
import com.aicreator.offline.domain.model.HistoryEntry
import kotlinx.coroutines.flow.Flow

interface HistoryRepository {
    fun observeHistory(): Flow<List<HistoryEntry>>
    fun observeFavorites(): Flow<List<HistoryEntry>>

    suspend fun recordSuccess(requestId: String, imagePath: String, metadata: GenerationMetadata)
    suspend fun recordError(requestId: String, params: GenerationParams, userMessage: String, durationMs: Long)
    suspend fun recordCancelled(requestId: String, params: GenerationParams, durationMs: Long)

    suspend fun setFavorite(id: String, isFavorite: Boolean)
    suspend fun deleteEntry(id: String)
    suspend fun clearAll()
}
