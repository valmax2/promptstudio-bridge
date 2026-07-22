package com.promptforge.pro.feature.charconsistency

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
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
import com.promptforge.pro.coremodel.CharacterPackView
import com.promptforge.pro.coremodel.CharacterProfile
import com.promptforge.pro.coreui.EnumDropdown
import com.promptforge.pro.coreui.PromptForgeButton

@Composable
fun CharacterEditorContent(character: CharacterProfile, viewModel: CharacterStudioViewModel) {
    val pickImages = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 6),
    ) { uris -> uris.forEach { viewModel.addReferenceImage(it.toString()) } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        OutlinedTextField(
            value = character.name,
            onValueChange = viewModel::onNameChange,
            label = { Text("Nome personaggio") },
            modifier = Modifier.fillMaxWidth(),
        )

        Text("Foto di riferimento", style = MaterialTheme.typography.titleMedium)
        ReferenceImagesRow(
            uris = character.referenceImageUris,
            onAdd = {
                pickImages.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
            onRemove = viewModel::removeReferenceImage,
        )
        Text(
            "Le foto restano solo su questo telefono, non vengono mai caricate finché non premi tu Invia a ComfyUI.",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        HorizontalDivider()

        Text("Descrizione identità (§8)", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(character.faceDescription, viewModel::onFaceDescriptionChange, label = { Text("Volto") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(character.bodyDescription, viewModel::onBodyDescriptionChange, label = { Text("Corporatura") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(character.hairDescription, viewModel::onHairDescriptionChange, label = { Text("Capelli") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(character.skinDescription, viewModel::onSkinDescriptionChange, label = { Text("Pelle") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(character.outfitDescription, viewModel::onOutfitDescriptionChange, label = { Text("Abiti") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(
            character.identifyingDetails,
            viewModel::onIdentifyingDetailsChange,
            label = { Text("Dettagli identificativi") },
            modifier = Modifier.fillMaxWidth(),
        )

        HorizontalDivider()

        Text("Parametri di consistenza", style = MaterialTheme.typography.titleMedium)
        EnumDropdown(
            label = "Metodo",
            selected = character.consistencyMethod,
            options = CharacterConsistencyMethod.entries,
            onSelected = viewModel::onConsistencyMethodChange,
        )
        LabeledSlider("Somiglianza", character.similarityStrength, viewModel::onSimilarityChange)
        LabeledSlider("Struttura del volto", character.faceStructureStrength, viewModel::onFaceStructureChange)
        LabeledSlider("Libertà di stile", character.styleFreedom, viewModel::onStyleFreedomChange)

        HorizontalDivider()

        Text("Character Pack — 6 viste standard", style = MaterialTheme.typography.titleMedium)
        Text(
            "L'invio a ComfyUI per generarle arriva col prossimo pezzo (client ComfyUI); qui intanto la scheda è pronta.",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        CharacterPackStatus(character)

        HorizontalDivider()

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PromptForgeButton(text = "Salva", onClick = viewModel::saveEditingCharacter, enabled = character.name.isNotBlank())
            TextButton(onClick = viewModel::stopEditing) { Text("Annulla") }
        }
    }
}

@Composable
private fun ReferenceImagesRow(uris: List<String>, onAdd: () -> Unit, onRemove: (String) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(uris) { uri ->
            Box {
                AsyncImage(
                    model = uri,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(88.dp).clip(RoundedCornerShape(12.dp)),
                )
                TextButton(onClick = { onRemove(uri) }) { Text("✕") }
            }
        }
        item {
            OutlinedButton(onClick = onAdd, modifier = Modifier.size(88.dp)) { Text("+") }
        }
    }
}

@Composable
private fun LabeledSlider(label: String, value: Float, onChange: (Float) -> Unit) {
    Column {
        Text("$label (${(value * 100).toInt()}%)", style = MaterialTheme.typography.labelMedium)
        Slider(value = value, onValueChange = onChange)
    }
}

@Composable
private fun CharacterPackStatus(character: CharacterProfile) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        CharacterPackView.entries.forEach { view ->
            val image = character.characterPack.firstOrNull { it.view == view }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(view.label, style = MaterialTheme.typography.bodyMedium)
                Text(
                    if (image?.imageUri != null) "✓ generata" else "non ancora generata",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
