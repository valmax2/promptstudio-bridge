package com.promptforge.pro.feature.builder

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.promptforge.pro.coredatabase.LibraryRepository
import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coremodel.LibraryItem
import com.promptforge.pro.coremodel.OutputConfig
import com.promptforge.pro.coremodel.PromptDraft
import com.promptforge.pro.coremodel.PromptRequest
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coremodel.VisualStyle
import com.promptforge.pro.promptengine.PromptEngine
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
) : ViewModel() {

    private val _uiState = MutableStateFlow(BuilderUiState())
    val uiState: StateFlow<BuilderUiState> = _uiState.asStateFlow()

    fun onItalianTextChange(text: String) {
        // una nuova dettatura/modifica dell'italiano non deve invalidare una
        // traduzione inglese già corretta a mano dall'utente (§4): qui ci
        // limitiamo a memorizzare il testo, la traduzione parte solo quando
        // l'utente preme esplicitamente "Traduci".
        _uiState.update { it.copy(italianText = text) }
    }

    fun onEnglishTextChange(text: String) {
        _uiState.update { it.copy(englishText = text) }
    }

    fun onMoodChange(mood: String) = _uiState.update { it.copy(mood = mood) }

    fun onVisualStyleChange(style: VisualStyle) = _uiState.update { it.copy(visualStyle = style) }

    fun onTargetModelChange(model: TargetModel) = _uiState.update { it.copy(targetModel = model) }

    fun onVariantCountChange(count: Int) = _uiState.update { it.copy(variantCount = count.coerceIn(1, 8)) }

    fun onDirectorMapChange(state: DirectorMapState) = _uiState.update { it.copy(directorMap = state) }

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

    fun generate() {
        val state = _uiState.value
        if (!state.canGenerate) return

        val request = PromptRequest(
            draft = PromptDraft(
                italianText = state.italianText,
                englishText = state.englishText,
                englishManuallyEdited = true,
            ),
            visualStyle = state.visualStyle,
            mood = state.mood,
            directorMap = state.directorMap,
            output = OutputConfig(targetModel = state.targetModel, variantCount = state.variantCount),
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
}
