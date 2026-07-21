package com.promptforge.pro.feature.builder

import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coremodel.VisualStyle

data class BuilderUiState(
    val italianText: String = "",
    val englishText: String = "",
    val isTranslating: Boolean = false,
    val visualStyle: VisualStyle = VisualStyle.Photorealistic,
    val mood: String = "",
    val targetModel: TargetModel = TargetModel.StableDiffusion,
    val variantCount: Int = 2,
    val directorMap: DirectorMapState = DirectorMapState.Default,
    val generatedPrompts: List<GeneratedPrompt> = emptyList(),
    val savedMessage: String? = null,
    val errorMessage: String? = null,
) {
    val canGenerate: Boolean get() = englishText.isNotBlank()
    val canSave: Boolean get() = generatedPrompts.isNotEmpty()
}
