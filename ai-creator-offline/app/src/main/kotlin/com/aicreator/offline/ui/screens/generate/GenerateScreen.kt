package com.aicreator.offline.ui.screens.generate

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.domain.model.AspectRatio
import com.aicreator.offline.domain.model.SchedulerType
import com.aicreator.offline.ui.components.MemoryEstimateBadge
import com.aicreator.offline.ui.components.SectionHeader
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun GenerateScreen(container: AppContainer) {
    val viewModel: GenerateViewModel = viewModel(
        factory = simpleViewModelFactory {
            GenerateViewModel(
                container.modelRepository,
                container.loraRepository,
                container.presetRepository,
                container.generateImageUseCase,
                container.deviceCapabilityAnalyzer,
                container.characterSelectionHolder,
                container.pendingParamsHolder,
            )
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showSaveDialog by remember { mutableStateOf(false) }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item { Text("Genera", style = MaterialTheme.typography.titleLarge) }

        if (state.characterMode != null) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                    AssistChip(onClick = {}, label = { Text("Modalità personaggio: ${state.characterMode}") })
                    androidx.compose.material3.IconButton(onClick = viewModel::onClearCharacterMode) {
                        Icon(Icons.Filled.Close, contentDescription = "Rimuovi modalità personaggio")
                    }
                }
                state.referenceImagePath?.let { path ->
                    val bitmap = remember(path) { BitmapFactory.decodeFile(path)?.asImageBitmap() }
                    bitmap?.let {
                        Image(it, contentDescription = "Immagine di riferimento", modifier = Modifier.size(120.dp).padding(top = 8.dp))
                    }
                }
            }
        }

        item {
            SectionHeader("Prompt")
            OutlinedTextField(
                value = state.positivePrompt,
                onValueChange = viewModel::onPositivePromptChanged,
                label = { Text("Prompt positivo") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
            )
            OutlinedTextField(
                value = state.negativePrompt,
                onValueChange = viewModel::onNegativePromptChanged,
                label = { Text("Prompt negativo") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                minLines = 2,
            )
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                Checkbox(checked = state.translateToEnglish, onCheckedChange = viewModel::onTranslateToggled)
                Text("Traduci in inglese (dizionario offline)")
            }
        }

        item {
            SectionHeader("Modello")
            ModelDropdown(
                models = state.models,
                selectedId = state.selectedModelId,
                onSelected = viewModel::onModelSelected,
            )
            if (state.loras.isNotEmpty()) {
                Text("LoRA disponibili per questo modello", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 8.dp))
                state.loras.forEach { lora ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = lora.id in state.selectedLoraIds, onCheckedChange = { viewModel.onLoraToggled(lora.id) })
                        Text(lora.displayName)
                    }
                }
            }
        }

        item {
            SectionHeader("Parametri")
            Text("Passi: ${state.steps}")
            Slider(value = state.steps.toFloat(), onValueChange = { viewModel.onStepsChanged(it.toInt()) }, valueRange = 1f..75f)
            Text("CFG: ${"%.1f".format(state.cfgScale)}")
            Slider(value = state.cfgScale, onValueChange = viewModel::onCfgChanged, valueRange = 1f..20f)

            SchedulerDropdown(selected = state.scheduler, onSelected = viewModel::onSchedulerChanged)
            AspectRatioRow(selected = state.aspectRatio, onSelected = viewModel::onAspectRatioChanged)

            Text("Risoluzione base: ${state.baseResolution}px")
            Slider(
                value = state.baseResolution.toFloat(),
                onValueChange = { viewModel.onBaseResolutionChanged((it.toInt() / 64) * 64) },
                valueRange = 384f..1024f,
                steps = 9,
            )

            OutlinedTextField(
                value = state.seedText,
                onValueChange = viewModel::onSeedTextChanged,
                label = { Text("Seed (vuoto = casuale)") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )

            if (state.characterMode != null) {
                Text("Intensità foto di riferimento: ${"%.2f".format(state.referenceStrength)}")
                Slider(value = state.referenceStrength, onValueChange = viewModel::onReferenceStrengthChanged)
                Text("Intensità coerenza volto: ${"%.2f".format(state.faceConsistencyStrength)}")
                Slider(value = state.faceConsistencyStrength, onValueChange = viewModel::onFaceStrengthChanged)
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = state.upscale, onCheckedChange = viewModel::onUpscaleToggled)
                Text("Upscaling locale (richiede un modello di upscaling importato)")
            }
        }

        item {
            MemoryEstimateBadge(
                availableRamMb = state.availableRamMb,
                requiredRamMb = state.estimatedRequiredRamMb,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            )
            state.thermalWarning?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }
        }

        item {
            if (state.isGenerating) {
                Text(state.progressStepLabel)
                LinearProgressIndicator(progress = { state.progressFraction }, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
                Text(
                    "L'interruzione ha effetto al termine del passo corrente, non istantaneamente.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                OutlinedButton(onClick = viewModel::stop, modifier = Modifier.fillMaxWidth()) { Text("Interrompi") }
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = viewModel::generate, modifier = Modifier.weight(1f)) { Text("Genera") }
                    OutlinedButton(onClick = { showSaveDialog = true }) { Text("Salva preset") }
                }
            }
            state.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
            }
        }

        item {
            state.resultImagePath?.let { path ->
                SectionHeader("Anteprima finale")
                val bitmap = remember(path) { BitmapFactory.decodeFile(path)?.asImageBitmap() }
                bitmap?.let {
                    Image(it, contentDescription = "Immagine generata", modifier = Modifier.fillMaxWidth().height(320.dp))
                }
            }
        }

        if (showSaveDialog) {
            item { SavePresetInline(onSave = { name -> viewModel.saveAsPreset(name); showSaveDialog = false }, onDismiss = { showSaveDialog = false }) }
        }
    }
}

@Composable
private fun SavePresetInline(onSave: (String) -> Unit, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nome preset") }, modifier = Modifier.fillMaxWidth())
        Row(modifier = Modifier.padding(top = 8.dp)) {
            Button(onClick = { if (name.isNotBlank()) onSave(name) }) { Text("Salva") }
            OutlinedButton(onClick = onDismiss, modifier = Modifier.padding(start = 8.dp)) { Text("Annulla") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModelDropdown(models: List<com.aicreator.offline.domain.model.AiModel>, selectedId: String?, onSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val selectedName = models.firstOrNull { it.id == selectedId }?.displayName ?: "Nessun modello attivo importato"
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selectedName,
            onValueChange = {},
            readOnly = true,
            label = { Text("Modello") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            models.forEach { model ->
                DropdownMenuItem(text = { Text(model.displayName) }, onClick = { onSelected(model.id); expanded = false })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SchedulerDropdown(selected: SchedulerType, onSelected: (SchedulerType) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selected.label,
            onValueChange = {},
            readOnly = true,
            label = { Text("Scheduler") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            SchedulerType.entries.forEach { scheduler ->
                DropdownMenuItem(text = { Text(scheduler.label) }, onClick = { onSelected(scheduler); expanded = false })
            }
        }
    }
}

@Composable
private fun AspectRatioRow(selected: AspectRatio, onSelected: (AspectRatio) -> Unit) {
    Row(modifier = Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AspectRatio.entries.forEach { ratio ->
            AssistChip(onClick = { onSelected(ratio) }, label = { Text(ratio.label) })
        }
    }
}
