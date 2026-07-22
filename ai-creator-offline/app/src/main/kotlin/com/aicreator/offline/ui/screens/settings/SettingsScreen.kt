package com.aicreator.offline.ui.screens.settings

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.data.local.datastore.ThemeMode
import com.aicreator.offline.ui.components.SectionHeader
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun SettingsScreen(container: AppContainer) {
    val viewModel: SettingsViewModel = viewModel(
        factory = simpleViewModelFactory { SettingsViewModel(container.settingsDataStore, container.deleteAllDataUseCase) },
    )
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val dataDeleted by viewModel.dataDeleted.collectAsStateWithLifecycle()
    var showDeleteConfirm by remember { mutableStateOf(false) }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item { Text("Impostazioni e privacy", style = MaterialTheme.typography.titleLarge) }

        item {
            SectionHeader("Tema")
            ThemeMode.entries.forEach { mode ->
                Row {
                    RadioButton(selected = settings.themeMode == mode, onClick = { viewModel.setThemeMode(mode) })
                    Text(
                        when (mode) {
                            ThemeMode.CHIARO -> "Chiaro"
                            ThemeMode.SCURO -> "Scuro"
                            ThemeMode.SISTEMA -> "Segui il sistema"
                        },
                    )
                }
            }
        }

        item {
            SectionHeader("Sicurezza")
            SettingsSwitchRow("Blocco app (impronta/volto/PIN del dispositivo)", settings.appLockEnabled, viewModel::setAppLockEnabled)
            SettingsSwitchRow("Blocca screenshot", settings.blockScreenshots, viewModel::setBlockScreenshots)
            SettingsSwitchRow("Nascondi anteprima nelle app recenti", settings.hideRecentsPreview, viewModel::setHideRecentsPreview)
            Text(
                "Blocco screenshot e anteprima recenti usano la stessa protezione di sistema (FLAG_SECURE): attivarne uno protegge anche l'altro caso d'uso.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        item {
            SectionHeader("Prestazioni")
            SettingsSwitchRow("Preferisci risparmio batteria durante la generazione", settings.batterySaverPreferred, viewModel::setBatterySaverPreferred)
        }

        item {
            SectionHeader("Privacy")
            Text(
                "AI Creator Offline elabora tutto sul dispositivo. Prompt, foto di riferimento e immagini generate " +
                    "non vengono mai inviati a server esterni, non ci sono servizi cloud, telemetria, pubblicità o " +
                    "caricamenti automatici. I file vivono nello storage privato dell'app e nel database locale " +
                    "cifrato; nessun log contiene prompt o percorsi di foto (vedi util/PrivacyLogger.kt).",
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        item {
            SectionHeader("Zona pericolosa")
            Button(onClick = { showDeleteConfirm = true }) { Text("Cancella tutti i dati") }
            if (dataDeleted) {
                Text("Tutti i dati sono stati cancellati.", color = MaterialTheme.colorScheme.primary)
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Cancellare tutti i dati?") },
            text = { Text("Elimina modelli importati, LoRA, preset, cronologia, galleria e personaggi salvati. L'operazione non è reversibile.") },
            confirmButton = {
                TextButton(onClick = { viewModel.deleteAllData(); showDeleteConfirm = false }) { Text("Cancella") }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = false }) { Text("Annulla") } },
        )
    }
}

@Composable
private fun SettingsSwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(label, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
