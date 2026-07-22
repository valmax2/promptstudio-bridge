package com.aicreator.offline.domain.repository

import com.aicreator.offline.domain.model.GenerationParams
import com.aicreator.offline.domain.model.Preset
import kotlinx.coroutines.flow.Flow

interface PresetRepository {
    fun observePresets(): Flow<List<Preset>>
    suspend fun savePreset(name: String, params: GenerationParams): Preset
    suspend fun deletePreset(id: String)
    suspend fun wipeAll()
}
