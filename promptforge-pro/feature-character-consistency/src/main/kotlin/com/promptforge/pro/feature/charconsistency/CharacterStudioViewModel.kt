package com.promptforge.pro.feature.charconsistency

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.promptforge.pro.coredatabase.CharacterRepository
import com.promptforge.pro.coremodel.CharacterConsistencyMethod
import com.promptforge.pro.coremodel.CharacterProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class CharacterStudioViewModel @Inject constructor(
    private val repository: CharacterRepository,
) : ViewModel() {

    val characters: StateFlow<List<CharacterProfile>> = repository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _editingCharacter = MutableStateFlow<CharacterProfile?>(null)
    val editingCharacter: StateFlow<CharacterProfile?> = _editingCharacter.asStateFlow()

    fun startNewCharacter() {
        val now = System.currentTimeMillis()
        _editingCharacter.value = CharacterProfile(
            id = UUID.randomUUID().toString(),
            name = "",
            createdAtEpochMillis = now,
            updatedAtEpochMillis = now,
        )
    }

    fun startEditingCharacter(character: CharacterProfile) {
        _editingCharacter.value = character
    }

    fun stopEditing() {
        _editingCharacter.value = null
    }

    fun updateEditing(transform: (CharacterProfile) -> CharacterProfile) {
        _editingCharacter.update { it?.let(transform) }
    }

    fun onNameChange(value: String) = updateEditing { it.copy(name = value) }
    fun onFaceDescriptionChange(value: String) = updateEditing { it.copy(faceDescription = value) }
    fun onBodyDescriptionChange(value: String) = updateEditing { it.copy(bodyDescription = value) }
    fun onHairDescriptionChange(value: String) = updateEditing { it.copy(hairDescription = value) }
    fun onSkinDescriptionChange(value: String) = updateEditing { it.copy(skinDescription = value) }
    fun onOutfitDescriptionChange(value: String) = updateEditing { it.copy(outfitDescription = value) }
    fun onIdentifyingDetailsChange(value: String) = updateEditing { it.copy(identifyingDetails = value) }
    fun onConsistencyMethodChange(method: CharacterConsistencyMethod) = updateEditing { it.copy(consistencyMethod = method) }
    fun onSimilarityChange(value: Float) = updateEditing { it.copy(similarityStrength = value) }
    fun onFaceStructureChange(value: Float) = updateEditing { it.copy(faceStructureStrength = value) }
    fun onStyleFreedomChange(value: Float) = updateEditing { it.copy(styleFreedom = value) }

    fun addReferenceImage(uri: String) = updateEditing { it.copy(referenceImageUris = it.referenceImageUris + uri) }
    fun removeReferenceImage(uri: String) = updateEditing { it.copy(referenceImageUris = it.referenceImageUris - uri) }

    fun saveEditingCharacter() {
        val character = _editingCharacter.value ?: return
        if (character.name.isBlank()) return
        viewModelScope.launch {
            repository.save(character.copy(updatedAtEpochMillis = System.currentTimeMillis()))
            stopEditing()
        }
    }

    fun deleteCharacter(character: CharacterProfile) {
        viewModelScope.launch { repository.delete(character) }
    }
}
