package com.aicreator.offline.ui.screens.gallery

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.model.ExportFormat
import com.aicreator.offline.domain.model.HistoryEntry
import com.aicreator.offline.domain.repository.GalleryRepository
import com.aicreator.offline.ui.state.PendingParamsHolder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class GalleryViewModel(
    private val galleryRepository: GalleryRepository,
    private val pendingParamsHolder: PendingParamsHolder,
) : ViewModel() {

    private val _items = MutableStateFlow<List<HistoryEntry>>(emptyList())
    val items: StateFlow<List<HistoryEntry>> = _items.asStateFlow()

    private val _exportError = MutableStateFlow<String?>(null)
    val exportError: StateFlow<String?> = _exportError.asStateFlow()

    init {
        viewModelScope.launch { galleryRepository.observeGallery().collect { _items.value = it } }
    }

    fun export(entryId: String, destinationUri: Uri, format: ExportFormat) {
        viewModelScope.launch {
            galleryRepository.exportImage(entryId, destinationUri, format).onFailure {
                _exportError.value = it.message ?: "Esportazione non riuscita."
            }
        }
    }

    fun delete(entryId: String) {
        viewModelScope.launch { galleryRepository.deleteEntry(entryId) }
    }

    fun reuseSettings(entry: HistoryEntry) {
        pendingParamsHolder.update(entry.params)
    }

    fun dismissError() { _exportError.value = null }
}
