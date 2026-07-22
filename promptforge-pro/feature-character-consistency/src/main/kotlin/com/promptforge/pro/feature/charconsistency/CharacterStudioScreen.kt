package com.promptforge.pro.feature.charconsistency

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.promptforge.pro.coreui.PromptForgeButton

/**
 * Character Studio (v7 §2/§8): libreria di personaggi riusabili tra più
 * generazioni, separata dal Builder (che oggi ha ancora un campo Personaggio
 * "usa e getta" — collegarlo a questa libreria è un passo successivo).
 */
@Composable
fun CharacterStudioScreen(viewModel: CharacterStudioViewModel = hiltViewModel()) {
    val characters by viewModel.characters.collectAsState()
    val editingCharacter by viewModel.editingCharacter.collectAsState()

    val editing = editingCharacter
    if (editing != null) {
        CharacterEditorContent(character = editing, viewModel = viewModel)
        return
    }

    if (characters.isEmpty()) {
        EmptyCharacterList(onCreateNew = viewModel::startNewCharacter)
        return
    }

    CharacterListContent(
        characters = characters,
        onCreateNew = viewModel::startNewCharacter,
        onSelect = viewModel::startEditingCharacter,
        onDelete = viewModel::deleteCharacter,
    )
}

@Composable
private fun EmptyCharacterList(onCreateNew: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                "Nessun personaggio ancora — crea una scheda per mantenere la stessa identità tra più immagini",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            PromptForgeButton(text = "Nuovo personaggio", onClick = onCreateNew)
        }
    }
}
