package com.aicreator.offline.domain.repository

import android.net.Uri
import com.aicreator.offline.domain.model.LoraAdapter
import kotlinx.coroutines.flow.Flow

interface LoraRepository {
    fun observeLoras(): Flow<List<LoraAdapter>>
    fun observeLorasForModel(modelId: String): Flow<List<LoraAdapter>>
    suspend fun getLoras(ids: List<String>): List<LoraAdapter>
    suspend fun importLora(treeUri: Uri): Result<LoraAdapter>
    suspend fun setEnabled(id: String, isEnabled: Boolean)
    suspend fun deleteLora(id: String)
    suspend fun wipeAll()
}
