package com.aicreator.offline.ui.screens.lora

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun LoraScreen(container: AppContainer) {
    val viewModel: LoraViewModel = viewModel(
        factory = simpleViewModelFactory { LoraViewModel(container.loraRepository, container.importModelUseCase) },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()
    val contentResolver = LocalContext.current.contentResolver

    val pickFolder = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            viewModel.importLora(uri)
        }
    }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Text("LoRA e adattatori", style = MaterialTheme.typography.titleLarge)
            Text(
                "Importa un adattatore LoRA (10-200 MB tipici) associato a un modello già importato.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Button(onClick = { pickFolder.launch(null) }, modifier = Modifier.padding(top = 8.dp)) { Text("Importa LoRA da cartella") }
            if (state.isImporting) CircularProgressIndicator(modifier = Modifier.padding(top = 8.dp))
            state.importError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }

        items(state.loras, key = { it.id }) { lora ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Row(modifier = Modifier.padding(12.dp)) {
                    Text(lora.displayName, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Switch(checked = lora.isEnabled, onCheckedChange = { viewModel.setEnabled(lora.id, it) })
                    TextButton(onClick = { viewModel.deleteLora(lora.id) }) { Text("Elimina") }
                }
            }
        }
    }
}
