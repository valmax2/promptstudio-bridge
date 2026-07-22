package com.aicreator.offline.ui.screens.presets

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun PresetsScreen(container: AppContainer) {
    val viewModel: PresetsViewModel = viewModel(
        factory = simpleViewModelFactory { PresetsViewModel(container.presetRepository, container.pendingParamsHolder) },
    )
    val presets by viewModel.presets.collectAsStateWithLifecycle()

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Text("Preset", style = MaterialTheme.typography.titleLarge)
            Text("Salva le tue combinazioni di parametri preferite dalla schermata Genera.", style = MaterialTheme.typography.bodyMedium)
        }
        if (presets.isEmpty()) {
            item { Text("Nessun preset salvato.", modifier = Modifier.padding(top = 16.dp)) }
        }
        items(presets, key = { it.id }) { preset ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Row(modifier = Modifier.padding(12.dp)) {
                    Text(preset.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    TextButton(onClick = { viewModel.applyPreset(preset) }) { Text("Usa") }
                    TextButton(onClick = { viewModel.deletePreset(preset.id) }) { Text("Elimina") }
                }
            }
        }
    }
}
