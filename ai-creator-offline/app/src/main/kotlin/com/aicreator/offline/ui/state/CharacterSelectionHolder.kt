package com.aicreator.offline.ui.state

import com.aicreator.offline.domain.model.CharacterMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class CharacterSelection(
    val characterId: String?,
    val imagePath: String?,
    val mode: CharacterMode,
    val referenceStrength: Float = 0.6f,
    val faceConsistencyStrength: Float = 0.6f,
)

/**
 * Stato condiviso in memoria (non persistito) tra le schermate Volto/Full Body
 * e la schermata Genera: evita di dover passare oggetti complessi come
 * argomenti di navigazione. Non è un dato sensibile da conservare a lungo:
 * vive solo finché il processo dell'app resta attivo.
 */
class CharacterSelectionHolder {
    private val _selection = MutableStateFlow<CharacterSelection?>(null)
    val selection: StateFlow<CharacterSelection?> = _selection.asStateFlow()

    fun update(selection: CharacterSelection?) {
        _selection.value = selection
    }
}

/** Stesso pattern di [CharacterSelectionHolder], per "Usa preset" e "Riutilizza queste impostazioni". */
class PendingParamsHolder {
    private val _pending = MutableStateFlow<com.aicreator.offline.domain.model.GenerationParams?>(null)
    val pending: StateFlow<com.aicreator.offline.domain.model.GenerationParams?> = _pending.asStateFlow()

    fun update(params: com.aicreator.offline.domain.model.GenerationParams?) {
        _pending.value = params
    }
}
