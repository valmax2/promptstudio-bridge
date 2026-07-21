package com.promptforge.pro.coredatabase

import com.promptforge.pro.coremodel.PromptForgeJson
import com.promptforge.pro.coremodel.PromptPreset
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.decodeFromString

interface PresetRepository {
    fun observeAll(): Flow<List<PromptPreset>>
    suspend fun save(preset: PromptPreset)
    suspend fun delete(preset: PromptPreset)

    /** §2 Preset: "duplicazione" — nuovo id, stesso contenuto. */
    suspend fun duplicate(preset: PromptPreset, newId: String, newName: String)

    /** §2 Preset: "importazione" da un JSON esportato in precedenza. */
    suspend fun importFromJson(json: String, newId: String)
}

class RoomPresetRepository(private val dao: PresetDao) : PresetRepository {
    override fun observeAll(): Flow<List<PromptPreset>> = dao.observeAll().map { it.map(PromptPresetEntity::toDomain) }

    override suspend fun save(preset: PromptPreset) = dao.upsert(preset.toEntity())

    override suspend fun delete(preset: PromptPreset) = dao.delete(preset.toEntity())

    override suspend fun duplicate(preset: PromptPreset, newId: String, newName: String) {
        dao.upsert(preset.copy(id = newId, name = newName, isBuiltIn = false).toEntity())
    }

    override suspend fun importFromJson(json: String, newId: String) {
        val imported = PromptForgeJson.instance.decodeFromString<PromptPreset>(json).copy(id = newId, isBuiltIn = false)
        dao.upsert(imported.toEntity())
    }
}
