package com.aicreator.offline.ui.screens.gallery

import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.domain.model.ExportFormat
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun GalleryScreen(container: AppContainer) {
    val viewModel: GalleryViewModel = viewModel(
        factory = simpleViewModelFactory { GalleryViewModel(container.galleryRepository, container.pendingParamsHolder) },
    )
    val items by viewModel.items.collectAsStateWithLifecycle()
    val exportError by viewModel.exportError.collectAsStateWithLifecycle()
    var targetEntryId by remember { mutableStateOf<String?>(null) }

    val exportPng = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("image/png")) { uri ->
        val id = targetEntryId
        if (uri != null && id != null) viewModel.export(id, uri, ExportFormat.PNG)
    }
    val exportJpg = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("image/jpeg")) { uri ->
        val id = targetEntryId
        if (uri != null && id != null) viewModel.export(id, uri, ExportFormat.JPG)
    }
    val exportWebp = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("image/webp")) { uri ->
        val id = targetEntryId
        if (uri != null && id != null) viewModel.export(id, uri, ExportFormat.WEBP)
    }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Text("Galleria privata", style = MaterialTheme.typography.titleLarge)
            Text("Solo sul dispositivo: nessuna immagine viene caricata altrove.", style = MaterialTheme.typography.bodyMedium)
            exportError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
        items(items, key = { it.id }) { entry ->
            val imagePath = entry.resultImagePath
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    if (imagePath != null) {
                        val bitmap = remember(imagePath) { BitmapFactory.decodeFile(imagePath)?.asImageBitmap() }
                        bitmap?.let { Image(it, contentDescription = null, modifier = Modifier.size(200.dp)) }
                    }
                    Text(entry.params.positivePrompt, maxLines = 2, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "Seed: ${entry.params.seed ?: "casuale"} · Passi: ${entry.params.steps} · CFG: ${entry.params.cfgScale} · " +
                            "${entry.params.width}x${entry.params.height} · Scheduler: ${entry.params.scheduler.label}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(modifier = Modifier.padding(top = 4.dp)) {
                        TextButton(onClick = { targetEntryId = entry.id; exportPng.launch("aicreator_${entry.id}.png") }) { Text("PNG") }
                        TextButton(onClick = { targetEntryId = entry.id; exportJpg.launch("aicreator_${entry.id}.jpg") }) { Text("JPG") }
                        TextButton(onClick = { targetEntryId = entry.id; exportWebp.launch("aicreator_${entry.id}.webp") }) { Text("WebP") }
                    }
                    Row {
                        OutlinedButton(onClick = { viewModel.reuseSettings(entry) }) { Text("Riusa impostazioni") }
                        TextButton(onClick = { viewModel.delete(entry.id) }) { Text("Elimina") }
                    }
                }
            }
        }
    }
}
