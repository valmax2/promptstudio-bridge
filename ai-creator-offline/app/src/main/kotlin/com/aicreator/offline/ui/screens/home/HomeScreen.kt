package com.aicreator.offline.ui.screens.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.navigation.AppDestination
import com.aicreator.offline.ui.components.SectionHeader
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun HomeScreen(container: AppContainer, onNavigate: (String) -> Unit) {
    val viewModel: HomeViewModel = viewModel(
        factory = simpleViewModelFactory {
            HomeViewModel(container.recommendProfileUseCase, container.historyRepository, container.modelRepository)
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Text("AI Creator Offline", style = MaterialTheme.typography.titleLarge)
            Text(
                "Generazione immagini AI completamente locale, senza server e senza connessione.",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 16.dp),
            )
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Profilo consigliato", style = MaterialTheme.typography.titleMedium)
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.padding(top = 8.dp))
                    } else {
                        state.recommendation?.let { rec ->
                            Text(rec.profile.label, style = MaterialTheme.typography.titleLarge)
                            Text(
                                "Risoluzione max ${rec.maxResolution}px · fino a ${rec.maxSteps} passi",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Text(rec.reasoning, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                    OutlinedButton(onClick = { onNavigate(AppDestination.DIAGNOSTICS.route) }, modifier = Modifier.padding(top = 8.dp)) {
                        Text("Vedi diagnostica completa")
                    }
                }
            }
        }

        item {
            SectionHeader("Modelli importati: ${state.modelCount}")
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = { onNavigate(AppDestination.MODELS.route) }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Text("Gestisci modelli")
                }
                OutlinedButton(onClick = { onNavigate(AppDestination.PRESETS.route) }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Text("Preset salvati")
                }
                OutlinedButton(onClick = { onNavigate(AppDestination.HISTORY.route) }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Text("Cronologia generazioni")
                }
            }
        }

        item { SectionHeader("Generazioni recenti") }
        if (state.recentGenerations.isEmpty()) {
            item { Text("Nessuna generazione ancora. Vai su \"Genera\" per iniziare.", style = MaterialTheme.typography.bodyMedium) }
        } else {
            items(state.recentGenerations, key = { it.id }) { entry ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(entry.params.positivePrompt, maxLines = 2, style = MaterialTheme.typography.bodyMedium)
                        Text(entry.status.name, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
