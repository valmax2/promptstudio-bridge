package com.aicreator.offline.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aicreator.offline.domain.model.AiModel

@Composable
fun ModelCard(
    model: AiModel,
    compatibility: AiModel.Compatibility,
    onToggleActive: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onVerifyIntegrity: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween) {
                Text(model.displayName, style = MaterialTheme.typography.titleMedium)
                Switch(checked = model.isActive, onCheckedChange = onToggleActive)
            }
            Text("Motore: ${model.engine}", style = MaterialTheme.typography.bodyMedium)
            Text(
                "Dimensione: ${model.sizeBytes / (1024 * 1024)} MB · RAM minima: ${model.minRamMb} MB · Risoluzione consigliata: ${model.recommendedResolution}px",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                text = when (compatibility) {
                    AiModel.Compatibility.COMPATIBLE -> "Compatibilità stimata: buona per questo dispositivo"
                    AiModel.Compatibility.MARGINALE -> "Compatibilità stimata: marginale, possibili rallentamenti o errori di memoria"
                    AiModel.Compatibility.INCOMPATIBILE -> "Compatibilità stimata: insufficiente per questo dispositivo"
                },
                color = when (compatibility) {
                    AiModel.Compatibility.COMPATIBLE -> MaterialTheme.colorScheme.primary
                    AiModel.Compatibility.MARGINALE -> androidx.compose.ui.graphics.Color(0xFFB26A00)
                    AiModel.Compatibility.INCOMPATIBILE -> MaterialTheme.colorScheme.error
                },
                style = MaterialTheme.typography.bodyMedium,
            )
            if (model.supportsLora) {
                Text("Supporta LoRA", style = MaterialTheme.typography.bodyMedium)
            }
            model.license?.let { Text("Licenza: $it", style = MaterialTheme.typography.bodyMedium) }

            Row(modifier = Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onVerifyIntegrity) { Text("Verifica integrità") }
                TextButton(onClick = onDelete) { Text("Elimina") }
            }
        }
    }
}
