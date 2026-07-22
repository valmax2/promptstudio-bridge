package com.aicreator.offline.data.repository

import android.net.Uri
import com.aicreator.offline.data.local.db.dao.CharacterDao
import com.aicreator.offline.data.local.db.toDomain
import com.aicreator.offline.data.local.db.toEntity
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.domain.model.CharacterReference
import com.aicreator.offline.domain.repository.CharacterRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.util.UUID

class CharacterRepositoryImpl(
    private val dao: CharacterDao,
    private val storage: PrivateStorageManager,
) : CharacterRepository {

    override fun observeCharacters(): Flow<List<CharacterReference>> = dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun saveCharacter(name: String, imageUri: Uri, mode: CharacterMode): Result<CharacterReference> =
        withContext(Dispatchers.IO) {
            runCatching {
                val imagePath = storage.copyReferenceImage(imageUri)
                val character = CharacterReference(
                    id = UUID.randomUUID().toString(),
                    name = name,
                    imagePath = imagePath,
                    mode = mode,
                    createdAt = System.currentTimeMillis(),
                )
                dao.upsert(character.toEntity())
                character
            }
        }

    override suspend fun deleteCharacter(id: String) = withContext(Dispatchers.IO) {
        val entity = dao.findById(id)
        entity?.imagePath?.let { storage.secureDelete(it) }
        dao.deleteById(id)
        Unit
    }

    override suspend fun wipeAll() = dao.deleteAll()
}
