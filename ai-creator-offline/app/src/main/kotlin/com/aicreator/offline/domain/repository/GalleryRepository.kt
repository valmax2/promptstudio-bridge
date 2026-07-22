package com.aicreator.offline.domain.repository

import android.net.Uri
import com.aicreator.offline.domain.model.ExportFormat
import com.aicreator.offline.domain.model.HistoryEntry
import kotlinx.coroutines.flow.Flow

interface GalleryRepository {
    /** Solo le generazioni riuscite (status SUCCESS con immagine salvata). */
    fun observeGallery(): Flow<List<HistoryEntry>>

    suspend fun exportImage(entryId: String, destinationUri: Uri, format: ExportFormat): Result<Unit>

    /** Elimina l'immagine (cancellazione sicura, vedi PrivateStorageManager) e la voce di cronologia/galleria associata. */
    suspend fun deleteEntry(entryId: String)
}
