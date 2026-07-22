package com.aicreator.offline.ui.screens.lora

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.WorkInfo
import com.aicreator.offline.domain.model.LoraAdapter
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.usecase.ImportModelUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoraUiState(
    val loras: List<LoraAdapter> = emptyList(),
    val isImporting: Boolean = false,
    val importError: String? = null,
)

class LoraViewModel(
    private val loraRepository: LoraRepository,
    private val importModelUseCase: ImportModelUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(LoraUiState())
    val state: StateFlow<LoraUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            loraRepository.observeLoras().collect { loras -> _state.value = _state.value.copy(loras = loras) }
        }
    }

    fun importLora(treeUri: Uri) {
        _state.value = _state.value.copy(isImporting = true, importError = null)
        viewModelScope.launch {
            importModelUseCase.enqueueLoraImport(treeUri).collect { info ->
                when (info.state) {
                    WorkInfo.State.SUCCEEDED -> _state.value = _state.value.copy(isImporting = false)
                    WorkInfo.State.FAILED -> {
                        val message = info.outputData.getString("error_message") ?: "Import LoRA non riuscito."
                        _state.value = _state.value.copy(isImporting = false, importError = message)
                    }
                    else -> Unit
                }
            }
        }
    }

    fun setEnabled(id: String, enabled: Boolean) {
        viewModelScope.launch { loraRepository.setEnabled(id, enabled) }
    }

    fun deleteLora(id: String) {
        viewModelScope.launch { loraRepository.deleteLora(id) }
    }
}
