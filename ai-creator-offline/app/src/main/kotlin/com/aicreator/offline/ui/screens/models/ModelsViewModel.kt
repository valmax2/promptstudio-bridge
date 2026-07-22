package com.aicreator.offline.ui.screens.models

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.aicreator.offline.domain.hardware.DeviceCapabilityAnalyzer
import com.aicreator.offline.domain.hardware.DeviceSnapshot
import com.aicreator.offline.domain.hardware.estimateCompatibility
import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.repository.ModelRepository
import com.aicreator.offline.domain.usecase.ImportModelUseCase
import com.aicreator.offline.worker.ChecksumWorker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ModelsUiState(
    val models: List<AiModel> = emptyList(),
    val deviceSnapshot: DeviceSnapshot? = null,
    val isImporting: Boolean = false,
    val importError: String? = null,
    val verificationMessage: String? = null,
)

class ModelsViewModel(
    private val modelRepository: ModelRepository,
    private val importModelUseCase: ImportModelUseCase,
    private val deviceCapabilityAnalyzer: DeviceCapabilityAnalyzer,
    private val appContext: Context,
) : ViewModel() {

    private val _state = MutableStateFlow(ModelsUiState())
    val state: StateFlow<ModelsUiState> = _state.asStateFlow()

    init {
        _state.value = _state.value.copy(deviceSnapshot = deviceCapabilityAnalyzer.snapshot())
        viewModelScope.launch {
            modelRepository.observeModels().collect { models ->
                _state.value = _state.value.copy(models = models)
            }
        }
    }

    fun compatibilityFor(model: AiModel): AiModel.Compatibility {
        val snapshot = _state.value.deviceSnapshot ?: return AiModel.Compatibility.MARGINALE
        return estimateCompatibility(model, snapshot)
    }

    fun importModel(treeUri: Uri) {
        _state.value = _state.value.copy(isImporting = true, importError = null)
        viewModelScope.launch {
            importModelUseCase.enqueueModelImport(treeUri).collect { info ->
                when (info.state) {
                    WorkInfo.State.SUCCEEDED -> _state.value = _state.value.copy(isImporting = false)
                    WorkInfo.State.FAILED -> {
                        val message = info.outputData.getString("error_message") ?: "Import non riuscito."
                        _state.value = _state.value.copy(isImporting = false, importError = message)
                    }
                    WorkInfo.State.CANCELLED -> _state.value = _state.value.copy(isImporting = false)
                    else -> Unit
                }
            }
        }
    }

    fun setActive(modelId: String, isActive: Boolean) {
        viewModelScope.launch { modelRepository.setActive(modelId, isActive) }
    }

    fun deleteModel(modelId: String) {
        viewModelScope.launch { modelRepository.deleteModel(modelId) }
    }

    fun verifyIntegrity(modelId: String) {
        val request = OneTimeWorkRequestBuilder<ChecksumWorker>()
            .setInputData(ChecksumWorker.buildInputData(modelId))
            .build()
        val workManager = WorkManager.getInstance(appContext)
        workManager.enqueue(request)
        viewModelScope.launch {
            workManager.getWorkInfoByIdFlow(request.id).collect { info ->
                if (info == null) return@collect
                when (info.state) {
                    WorkInfo.State.SUCCEEDED -> {
                        val matches = info.outputData.getBoolean(ChecksumWorker.KEY_MATCHES, false)
                        _state.value = _state.value.copy(
                            verificationMessage = if (matches) "Integrità verificata: il modello non è stato alterato." else "Attenzione: il checksum non corrisponde più. Il modello potrebbe essere danneggiato.",
                        )
                    }
                    WorkInfo.State.FAILED -> {
                        val message = info.outputData.getString(ChecksumWorker.KEY_ERROR_MESSAGE) ?: "Verifica non riuscita."
                        _state.value = _state.value.copy(verificationMessage = message)
                    }
                    else -> Unit
                }
            }
        }
    }

    fun dismissMessages() {
        _state.value = _state.value.copy(importError = null, verificationMessage = null)
    }
}
