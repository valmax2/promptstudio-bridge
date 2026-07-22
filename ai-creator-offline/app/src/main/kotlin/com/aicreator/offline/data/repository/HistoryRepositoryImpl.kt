package com.aicreator.offline.data.repository

import com.aicreator.offline.data.local.db.dao.HistoryDao
import com.aicreator.offline.data.local.db.entities.HistoryEntity
import com.aicreator.offline.data.local.db.toDomain
import com.aicreator.offline.domain.model.GenerationMetadata
import com.aicreator.offline.domain.model.GenerationParams
import com.aicreator.offline.domain.model.GenerationStatus
import com.aicreator.offline.domain.model.HistoryEntry
import com.aicreator.offline.domain.repository.HistoryRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class HistoryRepositoryImpl(private val dao: HistoryDao) : HistoryRepository {

    override fun observeHistory(): Flow<List<HistoryEntry>> = dao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observeFavorites(): Flow<List<HistoryEntry>> = dao.observeFavorites().map { list -> list.map { it.toDomain() } }

    override suspend fun recordSuccess(requestId: String, imagePath: String, metadata: GenerationMetadata) {
        dao.upsert(entityFor(requestId, metadata.params, GenerationStatus.SUCCESS, metadata, resultImagePath = imagePath))
    }

    override suspend fun recordError(requestId: String, params: GenerationParams, userMessage: String, durationMs: Long) {
        dao.upsert(entityFor(requestId, params, GenerationStatus.ERROR, metadata = null, errorMessage = userMessage, durationMs = durationMs))
    }

    override suspend fun recordCancelled(requestId: String, params: GenerationParams, durationMs: Long) {
        dao.upsert(entityFor(requestId, params, GenerationStatus.CANCELLED, metadata = null, durationMs = durationMs))
    }

    override suspend fun setFavorite(id: String, isFavorite: Boolean) = dao.setFavorite(id, isFavorite)

    override suspend fun deleteEntry(id: String) = dao.deleteById(id)

    override suspend fun clearAll() = dao.deleteAll()

    private fun entityFor(
        requestId: String,
        params: GenerationParams,
        status: GenerationStatus,
        metadata: GenerationMetadata?,
        errorMessage: String? = null,
        durationMs: Long = metadata?.durationMs ?: 0L,
        resultImagePath: String? = null,
    ) = HistoryEntity(
        id = requestId,
        positivePrompt = params.positivePrompt,
        negativePrompt = params.negativePrompt,
        translatePromptToEnglish = params.translatePromptToEnglish,
        seed = params.seed,
        steps = params.steps,
        cfgScale = params.cfgScale,
        scheduler = params.scheduler.name,
        width = params.width,
        height = params.height,
        modelId = params.modelId,
        loraIdsCsv = params.loraIds.joinToString(","),
        referenceImageUri = params.referenceImageUri,
        referenceStrength = params.referenceStrength,
        faceConsistencyStrength = params.faceConsistencyStrength,
        characterMode = params.characterMode?.name,
        upscale = params.upscale,
        resultImagePath = resultImagePath,
        status = status.name,
        errorMessage = errorMessage,
        engineId = metadata?.engineId,
        engineVersion = metadata?.engineVersion,
        actualSeed = metadata?.actualSeed,
        durationMs = durationMs,
        createdAt = System.currentTimeMillis(),
        isFavorite = false,
    )
}
