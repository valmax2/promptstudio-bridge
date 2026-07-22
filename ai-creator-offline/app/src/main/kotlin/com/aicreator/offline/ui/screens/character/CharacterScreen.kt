package com.aicreator.offline.ui.screens.character

import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.navigation.AppDestination
import com.aicreator.offline.ui.components.SectionHeader
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun CharacterScreen(container: AppContainer, onNavigate: (String) -> Unit) {
    val viewModel: CharacterViewModel = viewModel(
        factory = simpleViewModelFactory { CharacterViewModel(container.characterRepository, container.characterSelectionHolder) },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()
    var pendingImageUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var newName by remember { mutableStateOf("") }

    val pickImage = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        pendingImageUri = uri
    }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Text("Personaggio", style = MaterialTheme.typography.titleLarge)
            Text(
                "Carica una foto di riferimento per mantenere volto, capelli, corporatura e stile nelle nuove generazioni.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        item {
            SectionHeader("Aggiungi personaggio")
            OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("Nome") }, modifier = Modifier.fillMaxWidth())
            Row(modifier = Modifier.padding(top = 8.dp)) {
                OutlinedButton(onClick = { pickImage.launch("image/*") }) { Text(if (pendingImageUri == null) "Scegli foto" else "Foto selezionata") }
                Button(
                    onClick = {
                        val uri = pendingImageUri
                        if (uri != null && newName.isNotBlank()) {
                            viewModel.addCharacter(newName, uri, CharacterMode.PORTRAIT)
                            pendingImageUri = null
                            newName = ""
                        }
                    },
                    modifier = Modifier.padding(start = 8.dp),
                ) { Text("Salva") }
            }
            state.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }

        item { SectionHeader("Personaggi salvati") }
        items(state.characters, key = { it.id }) { character ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Row(modifier = Modifier.padding(12.dp)) {
                    val bitmap = remember(character.imagePath) { BitmapFactory.decodeFile(character.imagePath)?.asImageBitmap() }
                    bitmap?.let {
                        Image(it, contentDescription = character.name, modifier = Modifier.size(64.dp).clip(RoundedCornerShape(8.dp)))
                    }
                    Column(modifier = Modifier.padding(start = 12.dp)) {
                        Text(character.name, style = MaterialTheme.typography.titleMedium)
                        Row {
                            OutlinedButton(onClick = { viewModel.useCharacter(character, CharacterMode.PORTRAIT); onNavigate(AppDestination.FACE.route) }) {
                                Text("Usa: Volto")
                            }
                            OutlinedButton(
                                onClick = { viewModel.useCharacter(character, CharacterMode.FULL_BODY); onNavigate(AppDestination.FULL_BODY.route) },
                                modifier = Modifier.padding(start = 8.dp),
                            ) { Text("Usa: Full Body") }
                        }
                        OutlinedButton(onClick = { viewModel.deleteCharacter(character.id) }, modifier = Modifier.padding(top = 4.dp)) {
                            Text("Elimina")
                        }
                    }
                }
            }
        }
    }
}
