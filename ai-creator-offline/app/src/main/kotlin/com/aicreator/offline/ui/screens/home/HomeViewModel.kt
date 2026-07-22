package com.aicreator.offline.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.model.HistoryEntry
import com.aicreator.offline.domain.model.ProfileRecommendation
import com.aicreator.offline.domain.repository.HistoryRepository
import com.aicreator.offline.domain.repository.ModelRepository
import com.aicreator.offline.domain.usecase.RecommendProfileUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

data class HomeUiState(
    val recommendation: ProfileRecommendation? = null,
    val modelCount: Int = 0,
    val recentGenerations: List<HistoryEntry> = emptyList(),
    val isLoading: Boolean = true,
)

class HomeViewModel(
    private val recommendProfileUseCase: RecommendProfileUseCase,
    historyRepository: HistoryRepository,
    modelRepository: ModelRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch(Dispatchers.Default) {
            val outcome = recommendProfileUseCase.execute()
            _state.value = _state.value.copy(recommendation = outcome.recommendation, isLoading = false)
        }
        viewModelScope.launch {
            combine(historyRepository.observeHistory(), modelRepository.observeModels()) { history, models ->
                history.take(5) to models.size
            }.collect { (recent, modelCount) ->
                _state.value = _state.value.copy(recentGenerations = recent, modelCount = modelCount)
            }
        }
    }

    fun refreshRecommendation() {
        viewModelScope.launch(Dispatchers.Default) {
            val outcome = recommendProfileUseCase.execute()
            _state.value = _state.value.copy(recommendation = outcome.recommendation)
        }
    }
}
