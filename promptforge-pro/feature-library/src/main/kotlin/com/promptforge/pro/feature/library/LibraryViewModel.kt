package com.promptforge.pro.feature.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.promptforge.pro.coredatabase.LibraryRepository
import com.promptforge.pro.coremodel.LibraryItem
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val repository: LibraryRepository,
) : ViewModel() {

    val items: StateFlow<List<LibraryItem>> = repository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun toggleFavorite(item: LibraryItem) {
        viewModelScope.launch { repository.save(item.copy(favorite = !item.favorite)) }
    }

    fun delete(item: LibraryItem) {
        viewModelScope.launch { repository.delete(item) }
    }
}
