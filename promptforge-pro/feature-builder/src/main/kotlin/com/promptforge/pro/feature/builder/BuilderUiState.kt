package com.promptforge.pro.feature.builder

import com.promptforge.pro.coremodel.CharacterConsistencyMethod
import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coremodel.SubjectMode
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coremodel.VisualStyle
import com.promptforge.pro.speech.SpeechState

data class BuilderUiState(
    val currentStep: BuilderStep = BuilderStep.Subject,

    // Step 1: Soggetto
    val italianText: String = "",
    val englishText: String = "",
    val isTranslating: Boolean = false,
    val subjectMode: SubjectMode = SubjectMode.Single,
    val speechState: SpeechState = SpeechState.Idle,

    // Step 2: Personaggio (facoltativo)
    val characterEnabled: Boolean = false,
    val characterName: String = "",
    val characterImageUri: String? = null,
    val characterMethod: CharacterConsistencyMethod = CharacterConsistencyMethod.ReferenceOnly,
    val characterSimilarity: Float = 0.7f,

    // Step 3: Camera
    val directorMap: DirectorMapState = DirectorMapState.Default,

    // Step 4: Luce e ambiente
    val lightingStyle: String = "soft natural light",
    val timeOfDay: String = "day",
    val environmentSetting: String = "",
    val environmentWeather: String = "",
    val environmentColorGrading: String = "",

    // Step 5: Stile e output
    val visualStyle: VisualStyle = VisualStyle.Photorealistic,
    val mood: String = "",
    val targetModel: TargetModel = TargetModel.StableDiffusion,
    val variantCount: Int = 2,
    val aspectRatio: String = "1:1",

    // Step 6: Riepilogo
    val generatedPrompts: List<GeneratedPrompt> = emptyList(),
    val savedMessage: String? = null,
    val errorMessage: String? = null,
) {
    val canGenerate: Boolean get() = englishText.isNotBlank()
    val canSave: Boolean get() = generatedPrompts.isNotEmpty()

    fun canLeaveStep(step: BuilderStep): Boolean = when (step) {
        BuilderStep.Subject -> englishText.isNotBlank()
        else -> true
    }
}
