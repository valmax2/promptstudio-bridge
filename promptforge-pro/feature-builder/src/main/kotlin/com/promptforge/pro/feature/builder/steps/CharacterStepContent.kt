package com.promptforge.pro.feature.builder.steps

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.promptforge.pro.coremodel.CharacterConsistencyMethod
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel
import com.promptforge.pro.feature.builder.EnumDropdown

@Composable
fun CharacterStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    val pickImage = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri -> viewModel.onCharacterImageSelected(uri?.toString()) }

    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Switch(checked = uiState.characterEnabled, onCheckedChange = viewModel::onCharacterEnabledChange)
            Text("Mantieni lo stesso volto in tutte le varianti", style = MaterialTheme.typography.bodyMedium)
        }

        Text(
            "Facoltativo: lascia pure disattivato se non ti serve per questo prompt. " +
                "La foto resta solo su questo telefono, non viene mai caricata da nessuna parte.",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (uiState.characterEnabled) {
            OutlinedTextField(
                value = uiState.characterName,
                onValueChange = viewModel::onCharacterNameChange,
                label = { Text("Nome del personaggio") },
                modifier = Modifier.fillMaxWidth(),
            )

            if (uiState.characterImageUri != null) {
                AsyncImage(
                    model = uiState.characterImageUri,
                    contentDescription = "Foto di riferimento del personaggio",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(160.dp)
                        .clip(RoundedCornerShape(12.dp)),
                )
                TextButton(onClick = { viewModel.onCharacterImageSelected(null) }) {
                    Text("Rimuovi immagine")
                }
            } else {
                Button(onClick = {
                    pickImage.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }) {
                    Text("Scegli immagine")
                }
            }

            EnumDropdown(
                label = "Metodo di consistenza",
                selected = uiState.characterMethod,
                options = CharacterConsistencyMethod.entries,
                onSelected = viewModel::onCharacterMethodChange,
            )

            Column {
                Text("Somiglianza (${(uiState.characterSimilarity * 100).toInt()}%)", style = MaterialTheme.typography.labelMedium)
                Slider(
                    value = uiState.characterSimilarity,
                    onValueChange = viewModel::onCharacterSimilarityChange,
                    modifier = Modifier.height(24.dp),
                )
            }
        }
    }
}
