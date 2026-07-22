package com.aicreator.offline.data.repository

import com.aicreator.offline.data.local.db.dao.PresetDao
import com.aicreator.offline.data.local.db.toDomain
import com.aicreator.offline.data.local.db.toEntity
import com.aicreator.offline.domain.model.GenerationParams
import com.aicreator.offline.domain.model.Preset
import com.aicreator.offline.domain.repository.PresetRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID

class PresetRepositoryImpl(private val dao: PresetDao) : PresetRepository {

    override fun observePresets(): Flow<List<Preset>> = dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun savePreset(name: String, params: GenerationParams): Preset {
        val preset = Preset(id = UUID.randomUUID().toString(), name = name, params = params, createdAt = System.currentTimeMillis())
        dao.upsert(preset.toEntity())
        return preset
    }

    override suspend fun deletePreset(id: String) = dao.deleteById(id)

    override suspend fun wipeAll() = dao.deleteAll()
}
