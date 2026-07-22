package com.promptforge.pro.coredatabase

import com.promptforge.pro.coremodel.CharacterProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

interface CharacterRepository {
    fun observeAll(): Flow<List<CharacterProfile>>
    suspend fun getById(id: String): CharacterProfile?
    suspend fun save(character: CharacterProfile)
    suspend fun delete(character: CharacterProfile)
}

class RoomCharacterRepository(private val dao: CharacterDao) : CharacterRepository {
    override fun observeAll(): Flow<List<CharacterProfile>> =
        dao.observeAll().map { it.map(CharacterProfileEntity::toDomain) }

    override suspend fun getById(id: String): CharacterProfile? = dao.getById(id)?.toDomain()

    override suspend fun save(character: CharacterProfile) = dao.upsert(character.toEntity())

    override suspend fun delete(character: CharacterProfile) = dao.delete(character.toEntity())
}
