package com.aicreator.offline.ui.screens.history

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.ui.simpleViewModelFactory
import java.text.DateFormat
import java.util.Date

@Composable
fun HistoryScreen(container: AppContainer) {
    val viewModel: HistoryViewModel = viewModel(
        factory = simpleViewModelFactory { HistoryViewModel(container.historyRepository, container.pendingParamsHolder) },
    )
    val entries by viewModel.entries.collectAsStateWithLifecycle()
    val dateFormat = remember(Unit) { DateFormat.getDateTimeInstance() }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween) {
                Text("Cronologia", style = MaterialTheme.typography.titleLarge)
                TextButton(onClick = viewModel::clearAll) { Text("Svuota") }
            }
        }
        items(entries, key = { it.id }) { entry ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(entry.params.positivePrompt, maxLines = 2, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${entry.status.name} · ${dateFormat.format(Date(entry.createdAt))} · ${entry.durationMs} ms",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    entry.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Row(modifier = Modifier.padding(top = 4.dp)) {
                        OutlinedButton(onClick = { viewModel.reuseSettings(entry) }) { Text("Riusa impostazioni") }
                        TextButton(onClick = { viewModel.toggleFavorite(entry) }) { Text(if (entry.isFavorite) "★ Preferito" else "☆ Aggiungi ai preferiti") }
                        TextButton(onClick = { viewModel.deleteEntry(entry.id) }) { Text("Elimina") }
                    }
                }
            }
        }
    }
}
