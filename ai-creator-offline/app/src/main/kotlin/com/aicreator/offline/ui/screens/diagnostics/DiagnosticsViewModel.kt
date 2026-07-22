package com.aicreator.offline.ui.screens.diagnostics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.usecase.RecommendProfileUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DiagnosticsViewModel(private val recommendProfileUseCase: RecommendProfileUseCase) : ViewModel() {

    private val _outcome = MutableStateFlow<RecommendProfileUseCase.Outcome?>(null)
    val outcome: StateFlow<RecommendProfileUseCase.Outcome?> = _outcome.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch(Dispatchers.Default) {
            _outcome.value = recommendProfileUseCase.execute()
        }
    }
}
