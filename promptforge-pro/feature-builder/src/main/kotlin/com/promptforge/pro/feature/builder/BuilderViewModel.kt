package com.promptforge.pro.feature.builder

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.promptforge.pro.coredatabase.LibraryRepository
import com.promptforge.pro.coremodel.CharacterConsistencyMethod
import com.promptforge.pro.coremodel.CharacterReferenceConfig
import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coremodel.EnvironmentConfig
import com.promptforge.pro.coremodel.LibraryItem
import com.promptforge.pro.coremodel.LightingConfig
import com.promptforge.pro.coremodel.OutputConfig
import com.promptforge.pro.coremodel.PromptDraft
import com.promptforge.pro.coremodel.PromptRequest
import com.promptforge.pro.coremodel.SubjectMode
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coremodel.VisualStyle
import com.promptforge.pro.promptengine.PromptEngine
import com.promptforge.pro.speech.SpeechRecognitionEngine
import com.promptforge.pro.translation.TranslationEngine
import com.promptforge.pro.translation.TranslationResult
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class BuilderViewModel @Inject constructor(
    private val promptEngine: PromptEngine,
    private val translationEngine: TranslationEngine,
    private val libraryRepository: LibraryRepository,
    private val speechRecognitionEngine: SpeechRecognitionEngine,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BuilderUiState())
    val uiState: StateFlow<BuilderUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            speechRecognitionEngine.state.collect { speechState ->
                _uiState.update { it.copy(speechState = speechState) }
            }
        }
    }

    // --- Step 1: Soggetto -------------------------------------------------

    fun onItalianTextChange(text: String) {
        // una nuova dettatura/modifica dell'italiano non deve invalidare una
        // traduzione inglese già corretta a mano dall'utente (§4): qui ci
        // limitiamo a memorizzare il testo, la traduzione parte solo quando
        // l'utente preme esplicitamente "Traduci".
        _uiState.update { it.copy(italianText = text) }
    }

    fun onEnglishTextChange(text: String) = _uiState.update { it.copy(englishText = text) }

    fun onSubjectModeChange(mode: SubjectMode) = _uiState.update { it.copy(subjectMode = mode) }

    /** §5: "inserire testo parziale e finale senza duplicazioni" — qui accumuliamo
     * solo il risultato finale di ogni sessione di dettatura, appendendolo al testo
     * già presente invece di sovrascriverlo, così più dettature si sommano. */
    fun startDictation() {
        speechRecognitionEngine.startListening { recognizedText ->
            val existing = _uiState.value.italianText
            val combined = if (existing.isBlank()) recognizedText else "$existing $recognizedText"
            _uiState.update { it.copy(italianText = combined) }
            translate()
        }
    }

    fun stopDictation() = speechRecognitionEngine.stopListening()

    fun translate() {
        val italianText = _uiState.value.italianText
        if (italianText.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isTranslating = true, errorMessage = null) }
            when (val result = translationEngine.translateItalianToEnglish(italianText)) {
                is TranslationResult.Success -> _uiState.update {
                    it.copy(englishText = result.englishText, isTranslating = false)
                }
                is TranslationResult.Failure -> _uiState.update {
                    it.copy(isTranslating = false, errorMessage = result.reason)
                }
            }
        }
    }

    // --- Step 2: Personaggio -------------------------------------------------

    fun onCharacterEnabledChange(enabled: Boolean) = _uiState.update { it.copy(characterEnabled = enabled) }

    fun onCharacterNameChange(name: String) = _uiState.update { it.copy(characterName = name) }

    fun onCharacterImageSelected(uri: String?) = _uiState.update { it.copy(characterImageUri = uri) }

    fun onCharacterMethodChange(method: CharacterConsistencyMethod) = _uiState.update { it.copy(characterMethod = method) }

    fun onCharacterSimilarityChange(value: Float) = _uiState.update { it.copy(characterSimilarity = value) }

    // --- Step 3: Camera -------------------------------------------------

    fun onDirectorMapChange(state: DirectorMapState) = _uiState.update { it.copy(directorMap = state) }

    // --- Step 4: Luce e ambiente -------------------------------------------------

    fun onLightingStyleChange(value: String) = _uiState.update { it.copy(lightingStyle = value) }
    fun onTimeOfDayChange(value: String) = _uiState.update { it.copy(timeOfDay = value) }
    fun onEnvironmentSettingChange(value: String) = _uiState.update { it.copy(environmentSetting = value) }
    fun onEnvironmentWeatherChange(value: String) = _uiState.update { it.copy(environmentWeather = value) }
    fun onEnvironmentColorGradingChange(value: String) = _uiState.update { it.copy(environmentColorGrading = value) }

    // --- Step 5: Stile e output -------------------------------------------------

    fun onVisualStyleChange(style: VisualStyle) = _uiState.update { it.copy(visualStyle = style) }
    fun onMoodChange(mood: String) = _uiState.update { it.copy(mood = mood) }
    fun onTargetModelChange(model: TargetModel) = _uiState.update { it.copy(targetModel = model) }
    fun onVariantCountChange(count: Int) = _uiState.update { it.copy(variantCount = count.coerceIn(1, 8)) }
    fun onAspectRatioChange(value: String) = _uiState.update { it.copy(aspectRatio = value) }

    // --- Step 6: Riepilogo -------------------------------------------------

    fun generate() {
        val state = _uiState.value
        if (!state.canGenerate) return

        val characterReferences = if (state.characterEnabled && state.characterImageUri != null) {
            listOf(
                CharacterReferenceConfig(
                    characterName = state.characterName,
                    imageUri = state.characterImageUri,
                    method = state.characterMethod,
                    similarityStrength = state.characterSimilarity,
                ),
            )
        } else {
            emptyList()
        }

        val request = PromptRequest(
            draft = PromptDraft(
                italianText = state.italianText,
                englishText = state.englishText,
                englishManuallyEdited = true,
                subjectMode = state.subjectMode,
            ),
            characterReferences = characterReferences,
            visualStyle = state.visualStyle,
            mood = state.mood,
            directorMap = state.directorMap,
            lighting = LightingConfig(style = state.lightingStyle, timeOfDay = state.timeOfDay),
            environment = EnvironmentConfig(
                setting = state.environmentSetting,
                weather = state.environmentWeather,
                colorGrading = state.environmentColorGrading,
            ),
            output = OutputConfig(
                targetModel = state.targetModel,
                variantCount = state.variantCount,
                aspectRatio = state.aspectRatio,
            ),
        )

        val results = promptEngine.generate(request)
        _uiState.update { it.copy(generatedPrompts = results, savedMessage = null) }
    }

    fun saveToLibrary() {
        val state = _uiState.value
        if (!state.canSave) return

        viewModelScope.launch {
            val now = System.currentTimeMillis()
            libraryRepository.save(
                LibraryItem(
                    id = UUID.randomUUID().toString(),
                    draft = PromptDraft(
                        italianText = state.italianText,
                        englishText = state.englishText,
                        englishManuallyEdited = true,
                        subjectMode = state.subjectMode,
                    ),
                    generatedPrompts = state.generatedPrompts,
                    createdAtEpochMillis = now,
                    updatedAtEpochMillis = now,
                ),
            )
            _uiState.update { it.copy(savedMessage = "Salvato in libreria") }
        }
    }

    fun consumeSavedMessage() = _uiState.update { it.copy(savedMessage = null) }

    fun consumeErrorMessage() = _uiState.update { it.copy(errorMessage = null) }

    /** Ricomincia da capo dopo aver salvato, per generarne un altro senza riaprire lo schermo. */
    fun startNewPrompt() {
        _uiState.update { BuilderUiState() }
    }

    override fun onCleared() {
        speechRecognitionEngine.stopListening()
        super.onCleared()
    }
}
