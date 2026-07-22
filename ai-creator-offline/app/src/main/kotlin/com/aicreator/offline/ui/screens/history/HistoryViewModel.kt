package com.aicreator.offline.ui.screens.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.model.HistoryEntry
import com.aicreator.offline.domain.repository.HistoryRepository
import com.aicreator.offline.ui.state.PendingParamsHolder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HistoryViewModel(
    private val historyRepository: HistoryRepository,
    private val pendingParamsHolder: PendingParamsHolder,
) : ViewModel() {

    private val _entries = MutableStateFlow<List<HistoryEntry>>(emptyList())
    val entries: StateFlow<List<HistoryEntry>> = _entries.asStateFlow()

    init {
        viewModelScope.launch { historyRepository.observeHistory().collect { _entries.value = it } }
    }

    fun toggleFavorite(entry: HistoryEntry) {
        viewModelScope.launch { historyRepository.setFavorite(entry.id, !entry.isFavorite) }
    }

    fun deleteEntry(id: String) {
        viewModelScope.launch { historyRepository.deleteEntry(id) }
    }

    fun clearAll() {
        viewModelScope.launch { historyRepository.clearAll() }
    }

    fun reuseSettings(entry: HistoryEntry) {
        pendingParamsHolder.update(entry.params)
    }
}
