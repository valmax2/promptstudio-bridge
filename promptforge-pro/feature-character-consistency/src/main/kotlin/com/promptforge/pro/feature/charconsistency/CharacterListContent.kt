package com.promptforge.pro.feature.charconsistency

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.CharacterProfile
import com.promptforge.pro.coreui.PromptForgeButton
import com.promptforge.pro.coreui.PromptForgeCard

@Composable
fun CharacterListContent(
    characters: List<CharacterProfile>,
    onCreateNew: () -> Unit,
    onSelect: (CharacterProfile) -> Unit,
    onDelete: (CharacterProfile) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth().weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(characters, key = CharacterProfile::id) { character ->
                CharacterCard(character = character, onSelect = { onSelect(character) }, onDelete = { onDelete(character) })
            }
        }
        PromptForgeButton(
            text = "Nuovo personaggio",
            onClick = onCreateNew,
            modifier = Modifier.fillMaxWidth().padding(16.dp),
        )
    }
}

@Composable
private fun CharacterCard(character: CharacterProfile, onSelect: () -> Unit, onDelete: () -> Unit) {
    PromptForgeCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(character.name.ifBlank { "(senza nome)" }, style = MaterialTheme.typography.titleMedium)
            val packDone = character.characterPack.count { it.imageUri != null }
            Text(
                "${character.referenceImageUris.size} foto di riferimento · Character Pack ${packDone}/6",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row {
                TextButton(onClick = onDelete) { Text("Elimina") }
            }
        }
    }
}
