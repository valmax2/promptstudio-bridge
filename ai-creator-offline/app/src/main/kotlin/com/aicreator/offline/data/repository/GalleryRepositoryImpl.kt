package com.aicreator.offline.data.repository

import android.net.Uri
import com.aicreator.offline.data.local.db.dao.HistoryDao
import com.aicreator.offline.data.local.db.toDomain
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.domain.model.ExportFormat
import com.aicreator.offline.domain.model.HistoryEntry
import com.aicreator.offline.domain.repository.GalleryRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

class GalleryRepositoryImpl(
    private val dao: HistoryDao,
    private val storage: PrivateStorageManager,
) : GalleryRepository {

    override fun observeGallery(): Flow<List<HistoryEntry>> = dao.observeGallery().map { list -> list.map { it.toDomain() } }

    override suspend fun exportImage(entryId: String, destinationUri: Uri, format: ExportFormat): Result<Unit> =
        withContext(Dispatchers.IO) {
            val entry = dao.findById(entryId) ?: return@withContext Result.failure(IllegalArgumentException("Immagine non trovata"))
            val imagePath = entry.resultImagePath ?: return@withContext Result.failure(IllegalStateException("Nessuna immagine associata"))
            storage.exportImage(imagePath, destinationUri, format)
        }

    override suspend fun deleteEntry(entryId: String) = withContext(Dispatchers.IO) {
        val entry = dao.findById(entryId) ?: return@withContext
        entry.resultImagePath?.let { storage.secureDelete(it) }
        dao.deleteById(entryId)
    }
}
