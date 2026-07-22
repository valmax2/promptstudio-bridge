package com.aicreator.offline.ui.screens.diagnostics

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.ui.components.SectionHeader
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun DiagnosticsScreen(container: AppContainer) {
    val viewModel: DiagnosticsViewModel = viewModel(
        factory = simpleViewModelFactory { DiagnosticsViewModel(container.recommendProfileUseCase) },
    )
    val outcome by viewModel.outcome.collectAsStateWithLifecycle()

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Text("Diagnostica dispositivo", style = MaterialTheme.typography.titleLarge)
            Button(onClick = viewModel::refresh, modifier = Modifier.padding(top = 8.dp)) { Text("Aggiorna") }
        }

        val snapshot = outcome?.snapshot
        val recommendation = outcome?.recommendation
        if (snapshot != null) {
            item {
                SectionHeader("Sistema")
                Text("Android ${snapshot.androidRelease} (API ${snapshot.androidSdkInt})")
                Text("CPU: ${snapshot.cpuCoreCount} core · ABI: ${snapshot.supportedAbis.joinToString()}")
            }
            item {
                SectionHeader("Memoria e storage")
                Text("RAM totale: ${snapshot.totalRamMb} MB · RAM libera: ${snapshot.availableRamMb} MB")
                Text("Dispositivo a bassa RAM (isLowRamDevice): ${snapshot.isLowRamDevice}")
                Text("Spazio libero: ${snapshot.freeStorageMb} MB")
            }
            item {
                SectionHeader("GPU e accelerazione")
                Text("OpenGL ES: ${snapshot.openGlEsVersion}")
                Text("Vulkan: ${if (snapshot.vulkanSupported) "supportato" else "non rilevato"}")
                Text("NNAPI: ${if (snapshot.nnapiAvailable) "disponibile" else "non disponibile"}")
                Text(snapshot.npuDetectionNote, style = MaterialTheme.typography.bodyMedium)
            }
            item {
                SectionHeader("Temperatura e batteria")
                Text("Stato termico: ${snapshot.thermalStatus}")
                Text("Batteria: ${snapshot.batteryPercent}%${if (snapshot.isCharging) " (in carica)" else ""}")
                Text("Risparmio energetico attivo: ${snapshot.isPowerSaveMode}")
            }
        }

        if (recommendation != null) {
            item {
                SectionHeader("Raccomandazione")
                Text("Profilo: ${recommendation.profile.label}", style = MaterialTheme.typography.titleMedium)
                Text("Risoluzione massima: ${recommendation.maxResolution}px · Passi massimi: ${recommendation.maxSteps}")
                if (recommendation.disabledFeatures.isNotEmpty()) {
                    Text("Funzioni disattivate: ${recommendation.disabledFeatures.joinToString()}")
                }
                Text(recommendation.reasoning, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
