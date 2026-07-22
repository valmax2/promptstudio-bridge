package com.aicreator.offline.ui.screens.models

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.offline.AppContainer
import com.aicreator.offline.ui.components.ModelCard
import com.aicreator.offline.ui.components.SectionHeader
import com.aicreator.offline.ui.simpleViewModelFactory

@Composable
fun ModelsScreen(container: AppContainer) {
    val viewModel: ModelsViewModel = viewModel(
        factory = simpleViewModelFactory {
            ModelsViewModel(container.modelRepository, container.importModelUseCase, container.deviceCapabilityAnalyzer, container.appContext)
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()
    val contentResolver = LocalContext.current.contentResolver

    val pickFolder = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            viewModel.importModel(uri)
        }
    }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        item {
            Text("Modelli", style = MaterialTheme.typography.titleLarge)
            Text(
                "Importa un modello dalla memoria del telefono. Nessun modello è incluso nell'app: vedi docs/MODEL_CONVERSION.md.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Button(onClick = { pickFolder.launch(null) }, modifier = Modifier.padding(top = 8.dp)) {
                Text("Importa modello da cartella")
            }
            if (state.isImporting) {
                CircularProgressIndicator(modifier = Modifier.padding(top = 8.dp))
            }
            state.importError?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp)) }
            state.verificationMessage?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
        }

        item { SectionHeader("Modelli importati (${state.models.size})") }
        items(state.models, key = { it.id }) { model ->
            ModelCard(
                model = model,
                compatibility = viewModel.compatibilityFor(model),
                onToggleActive = { viewModel.setActive(model.id, it) },
                onDelete = { viewModel.deleteModel(model.id) },
                onVerifyIntegrity = { viewModel.verifyIntegrity(model.id) },
            )
        }
    }
}
