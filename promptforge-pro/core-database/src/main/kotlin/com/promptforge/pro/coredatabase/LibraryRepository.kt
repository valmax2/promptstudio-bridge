package com.promptforge.pro.coredatabase

import com.promptforge.pro.coremodel.LibraryItem
import com.promptforge.pro.coremodel.PromptForgeJson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer

interface LibraryRepository {
    fun observeAll(): Flow<List<LibraryItem>>
    fun search(query: String): Flow<List<LibraryItem>>
    fun observeFavorites(): Flow<List<LibraryItem>>
    suspend fun save(item: LibraryItem)
    suspend fun delete(item: LibraryItem)

    /** §2 Libreria: "esportazione/importazione JSON". Snapshot puntuale, non un flusso. */
    suspend fun exportAllAsJson(): String
}

class RoomLibraryRepository(private val dao: LibraryDao) : LibraryRepository {
    override fun observeAll(): Flow<List<LibraryItem>> = dao.observeAll().map { it.map(LibraryItemEntity::toDomain) }

    override fun search(query: String): Flow<List<LibraryItem>> =
        dao.search(query).map { it.map(LibraryItemEntity::toDomain) }

    override fun observeFavorites(): Flow<List<LibraryItem>> =
        dao.observeFavorites().map { it.map(LibraryItemEntity::toDomain) }

    override suspend fun save(item: LibraryItem) = dao.upsert(item.toEntity())

    override suspend fun delete(item: LibraryItem) = dao.delete(item.toEntity())

    override suspend fun exportAllAsJson(): String {
        val items = dao.observeAll().first().map(LibraryItemEntity::toDomain)
        return PromptForgeJson.instance.encodeToString(ListSerializer(LibraryItem.serializer()), items)
    }
}
