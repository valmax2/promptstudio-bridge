package com.aicreator.offline.ui.screens.character

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.domain.model.CharacterReference
import com.aicreator.offline.domain.repository.CharacterRepository
import com.aicreator.offline.ui.state.CharacterSelection
import com.aicreator.offline.ui.state.CharacterSelectionHolder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CharacterUiState(
    val characters: List<CharacterReference> = emptyList(),
    val errorMessage: String? = null,
)

class CharacterViewModel(
    private val characterRepository: CharacterRepository,
    private val characterSelectionHolder: CharacterSelectionHolder,
) : ViewModel() {

    private val _state = MutableStateFlow(CharacterUiState())
    val state: StateFlow<CharacterUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            characterRepository.observeCharacters().collect { characters ->
                _state.value = _state.value.copy(characters = characters)
            }
        }
    }

    fun addCharacter(name: String, imageUri: Uri, mode: CharacterMode) {
        viewModelScope.launch {
            characterRepository.saveCharacter(name, imageUri, mode).onFailure {
                _state.value = _state.value.copy(errorMessage = it.message ?: "Import immagine non riuscito.")
            }
        }
    }

    fun deleteCharacter(id: String) {
        viewModelScope.launch { characterRepository.deleteCharacter(id) }
    }

    fun useCharacter(character: CharacterReference, mode: CharacterMode) {
        characterSelectionHolder.update(
            CharacterSelection(characterId = character.id, imagePath = character.imagePath, mode = mode),
        )
    }

    fun dismissError() { _state.value = _state.value.copy(errorMessage = null) }
}
