package com.aicreator.offline.ui.screens.generate

import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.model.AspectRatio
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.domain.model.LoraAdapter
import com.aicreator.offline.domain.model.SchedulerType

data class GenerateUiState(
    val models: List<AiModel> = emptyList(),
    val selectedModelId: String? = null,
    val loras: List<LoraAdapter> = emptyList(),
    val selectedLoraIds: Set<String> = emptySet(),
    val positivePrompt: String = "",
    val negativePrompt: String = "",
    val translateToEnglish: Boolean = false,
    val seedText: String = "",
    val steps: Int = 20,
    val cfgScale: Float = 7f,
    val scheduler: SchedulerType = SchedulerType.EULER_ANCESTRAL,
    val aspectRatio: AspectRatio = AspectRatio.SQUARE,
    val baseResolution: Int = 512,
    val characterMode: CharacterMode? = null,
    val referenceImagePath: String? = null,
    val referenceStrength: Float = 0.6f,
    val faceConsistencyStrength: Float = 0.6f,
    val upscale: Boolean = false,
    val availableRamMb: Int = 0,
    val estimatedRequiredRamMb: Int = 0,
    val thermalWarning: String? = null,
    val isGenerating: Boolean = false,
    val progressFraction: Float = 0f,
    val progressStepLabel: String = "",
    val resultImagePath: String? = null,
    val errorMessage: String? = null,
    val currentRequestId: String? = null,
) {
    val selectedModel: AiModel? get() = models.firstOrNull { it.id == selectedModelId }

    /** Larghezza/altezza effettive, arrotondate a multipli di 8 (requisito comune ai motori di diffusion). */
    fun effectiveWidthHeight(): Pair<Int, Int> {
        val maxSide = maxOf(aspectRatio.width, aspectRatio.height)
        val scale = baseResolution.toFloat() / maxSide
        val width = ((aspectRatio.width * scale).toInt() / 8) * 8
        val height = ((aspectRatio.height * scale).toInt() / 8) * 8
        return width.coerceAtLeast(64) to height.coerceAtLeast(64)
    }
}
