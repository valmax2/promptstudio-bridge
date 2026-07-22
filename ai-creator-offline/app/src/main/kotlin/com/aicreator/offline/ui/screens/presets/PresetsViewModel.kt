package com.aicreator.offline.ui.screens.presets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.model.Preset
import com.aicreator.offline.domain.repository.PresetRepository
import com.aicreator.offline.ui.state.PendingParamsHolder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PresetsViewModel(
    private val presetRepository: PresetRepository,
    private val pendingParamsHolder: PendingParamsHolder,
) : ViewModel() {

    private val _presets = MutableStateFlow<List<Preset>>(emptyList())
    val presets: StateFlow<List<Preset>> = _presets.asStateFlow()

    init {
        viewModelScope.launch { presetRepository.observePresets().collect { _presets.value = it } }
    }

    fun applyPreset(preset: Preset) {
        pendingParamsHolder.update(preset.params)
    }

    fun deletePreset(id: String) {
        viewModelScope.launch { presetRepository.deletePreset(id) }
    }
}
