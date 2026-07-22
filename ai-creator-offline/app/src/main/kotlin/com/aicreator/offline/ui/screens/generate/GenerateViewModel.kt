package com.aicreator.offline.ui.screens.generate

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.engine.GenerationUpdate
import com.aicreator.offline.domain.hardware.DeviceCapabilityAnalyzer
import com.aicreator.offline.domain.hardware.ThermalStatus
import com.aicreator.offline.domain.model.AspectRatio
import com.aicreator.offline.domain.model.GenerationParams
import com.aicreator.offline.domain.model.GenerationRequest
import com.aicreator.offline.domain.model.GenerationResult
import com.aicreator.offline.domain.model.SchedulerType
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.repository.ModelRepository
import com.aicreator.offline.domain.repository.PresetRepository
import com.aicreator.offline.domain.usecase.GenerateImageUseCase
import com.aicreator.offline.ui.state.CharacterSelectionHolder
import com.aicreator.offline.ui.state.PendingParamsHolder
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class GenerateViewModel(
    private val modelRepository: ModelRepository,
    private val loraRepository: LoraRepository,
    private val presetRepository: PresetRepository,
    private val generateImageUseCase: GenerateImageUseCase,
    private val hardwareAnalyzer: DeviceCapabilityAnalyzer,
    private val characterSelectionHolder: CharacterSelectionHolder,
    private val pendingParamsHolder: PendingParamsHolder,
) : ViewModel() {

    private val _state = MutableStateFlow(GenerateUiState())
    val state: StateFlow<GenerateUiState> = _state.asStateFlow()

    private var generationJob: Job? = null

    init {
        viewModelScope.launch {
            modelRepository.observeModels().collect { models ->
                val active = models.filter { it.isActive }
                _state.value = _state.value.copy(
                    models = active,
                    selectedModelId = _state.value.selectedModelId ?: active.firstOrNull()?.id,
                )
                refreshMemoryEstimate()
            }
        }
        viewModelScope.launch {
            pendingParamsHolder.pending.collect { params ->
                if (params != null) {
                    applyParams(params)
                    pendingParamsHolder.update(null)
                }
            }
        }
        viewModelScope.launch {
            characterSelectionHolder.selection.collect { selection ->
                if (selection != null) {
                    _state.value = _state.value.copy(
                        characterMode = selection.mode,
                        referenceImagePath = selection.imagePath,
                        referenceStrength = selection.referenceStrength,
                        faceConsistencyStrength = selection.faceConsistencyStrength,
                    )
                }
            }
        }
        refreshMemoryEstimate()
    }

    fun onModelSelected(modelId: String) {
        _state.value = _state.value.copy(selectedModelId = modelId, selectedLoraIds = emptySet())
        viewModelScope.launch {
            loraRepository.observeLorasForModel(modelId).collect { loras ->
                _state.value = _state.value.copy(loras = loras)
            }
        }
        refreshMemoryEstimate()
    }

    fun onLoraToggled(loraId: String) {
        val current = _state.value.selectedLoraIds
        _state.value = _state.value.copy(selectedLoraIds = if (loraId in current) current - loraId else current + loraId)
    }

    fun onPositivePromptChanged(value: String) { _state.value = _state.value.copy(positivePrompt = value) }
    fun onNegativePromptChanged(value: String) { _state.value = _state.value.copy(negativePrompt = value) }
    fun onTranslateToggled(value: Boolean) { _state.value = _state.value.copy(translateToEnglish = value) }
    fun onSeedTextChanged(value: String) { _state.value = _state.value.copy(seedText = value) }
    fun onStepsChanged(value: Int) { _state.value = _state.value.copy(steps = value) }
    fun onCfgChanged(value: Float) { _state.value = _state.value.copy(cfgScale = value) }
    fun onSchedulerChanged(value: SchedulerType) { _state.value = _state.value.copy(scheduler = value) }
    fun onAspectRatioChanged(value: AspectRatio) { _state.value = _state.value.copy(aspectRatio = value); refreshMemoryEstimate() }
    fun onBaseResolutionChanged(value: Int) { _state.value = _state.value.copy(baseResolution = value); refreshMemoryEstimate() }
    fun onReferenceStrengthChanged(value: Float) { _state.value = _state.value.copy(referenceStrength = value) }
    fun onFaceStrengthChanged(value: Float) { _state.value = _state.value.copy(faceConsistencyStrength = value) }
    fun onUpscaleToggled(value: Boolean) { _state.value = _state.value.copy(upscale = value) }
    fun onClearCharacterMode() {
        characterSelectionHolder.update(null)
        _state.value = _state.value.copy(characterMode = null, referenceImagePath = null)
    }

    /** Usato da Cronologia/Galleria per "Riutilizza queste impostazioni". */
    fun applyParams(params: GenerationParams) {
        _state.value = _state.value.copy(
            selectedModelId = params.modelId,
            positivePrompt = params.positivePrompt,
            negativePrompt = params.negativePrompt,
            translateToEnglish = params.translatePromptToEnglish,
            seedText = params.seed?.toString() ?: "",
            steps = params.steps,
            cfgScale = params.cfgScale,
            scheduler = params.scheduler,
            baseResolution = maxOf(params.width, params.height),
            selectedLoraIds = params.loraIds.toSet(),
            referenceImagePath = params.referenceImageUri,
            referenceStrength = params.referenceStrength,
            faceConsistencyStrength = params.faceConsistencyStrength,
            characterMode = params.characterMode,
            upscale = params.upscale,
        )
    }

    fun saveAsPreset(name: String) {
        val params = buildParamsOrNull() ?: return
        viewModelScope.launch { presetRepository.savePreset(name, params) }
    }

    fun generate() {
        val params = buildParamsOrNull() ?: run {
            _state.value = _state.value.copy(errorMessage = "Compila almeno il prompt positivo e seleziona un modello.")
            return
        }
        val request = GenerationRequest(params = params)
        _state.value = _state.value.copy(isGenerating = true, progressFraction = 0f, resultImagePath = null, errorMessage = null, currentRequestId = request.id)

        generationJob = viewModelScope.launch {
            generateImageUseCase.execute(request).collect { update ->
                when (update) {
                    is GenerationUpdate.Progress -> {
                        _state.value = _state.value.copy(
                            progressFraction = update.progress.fraction,
                            progressStepLabel = "Passo ${update.progress.currentStep}/${update.progress.totalSteps}",
                        )
                    }
                    is GenerationUpdate.Finished -> {
                        _state.value = when (val result = update.result) {
                            is GenerationResult.Success -> _state.value.copy(isGenerating = false, resultImagePath = result.imagePath, currentRequestId = null)
                            is GenerationResult.Error -> _state.value.copy(isGenerating = false, errorMessage = result.userMessage, currentRequestId = null)
                            GenerationResult.Cancelled -> _state.value.copy(isGenerating = false, errorMessage = "Generazione interrotta.", currentRequestId = null)
                        }
                    }
                }
            }
        }
    }

    fun stop() {
        val requestId = _state.value.currentRequestId ?: return
        generateImageUseCase.stop(requestId)
    }

    private fun refreshMemoryEstimate() {
        val model = _state.value.selectedModel
        _state.value = _state.value.copy(
            availableRamMb = hardwareAnalyzer.availableRamMb(),
            estimatedRequiredRamMb = model?.minRamMb ?: 0,
            thermalWarning = thermalWarningFor(hardwareAnalyzer.snapshot().thermalStatus),
        )
    }

    private fun thermalWarningFor(status: ThermalStatus): String? = when (status) {
        ThermalStatus.MODERATO -> "Il dispositivo si sta scaldando: la generazione potrebbe rallentare."
        ThermalStatus.SEVERO, ThermalStatus.CRITICO, ThermalStatus.EMERGENZA, ThermalStatus.SPEGNIMENTO_IMMINENTE ->
            "Temperatura elevata: si consiglia di attendere prima di generare altre immagini."
        else -> null
    }

    private fun buildParamsOrNull(): GenerationParams? {
        val s = _state.value
        val modelId = s.selectedModelId ?: return null
        if (s.positivePrompt.isBlank()) return null
        val (width, height) = s.effectiveWidthHeight()
        val seed = s.seedText.toLongOrNull()
        return runCatching {
            GenerationParams(
                positivePrompt = s.positivePrompt,
                negativePrompt = s.negativePrompt,
                translatePromptToEnglish = s.translateToEnglish,
                seed = seed,
                steps = s.steps,
                cfgScale = s.cfgScale,
                scheduler = s.scheduler,
                width = width,
                height = height,
                modelId = modelId,
                loraIds = s.selectedLoraIds.toList(),
                referenceImageUri = s.referenceImagePath,
                referenceStrength = s.referenceStrength,
                faceConsistencyStrength = s.faceConsistencyStrength,
                characterMode = s.characterMode,
                upscale = s.upscale,
            )
        }.getOrNull()
    }
}
