package com.aicreator.offline.domain.repository

import android.net.Uri
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.domain.model.CharacterReference
import kotlinx.coroutines.flow.Flow

interface CharacterRepository {
    fun observeCharacters(): Flow<List<CharacterReference>>
    suspend fun saveCharacter(name: String, imageUri: Uri, mode: CharacterMode): Result<CharacterReference>
    suspend fun deleteCharacter(id: String)
    suspend fun wipeAll()
}
