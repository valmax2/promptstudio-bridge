package com.promptforge.pro.feature.directormap

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.CameraMovement
import com.promptforge.pro.coremodel.DirectorMapGeometry
import com.promptforge.pro.coremodel.DirectorMapInteractions
import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coreui.PromptForgeColors

/**
 * Pannello completo della Director Map: le due viste (dall'alto e laterale,
 * §3 + richiesta esplicita di renderla intuitiva anche lateralmente/dall'alto)
 * più i controlli che il documento originale chiede esplicitamente — zoom,
 * movimento camera, reset, inverti lati — e un riepilogo leggibile dei valori
 * geometrici correnti (distanza, vista relativa, altezza).
 */
@Composable
fun DirectorMapPanel(
    state: DirectorMapState,
    onStateChange: (DirectorMapState) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Vista dall'alto — orbita e distanza", style = MaterialTheme.typography.labelMedium)
        TopDownDirectorMap(state = state, onStateChange = onStateChange)

        Text("Vista laterale — altezza camera", style = MaterialTheme.typography.labelMedium)
        LateralDirectorMap(state = state, onStateChange = onStateChange)

        DirectorMapSummary(state)

        Text("Zoom (${state.zoomPercent}%)", style = MaterialTheme.typography.labelMedium)
        Slider(
            value = state.zoomPercent.toFloat(),
            valueRange = DirectorMapGeometry.MIN_ZOOM_PERCENT.toFloat()..DirectorMapGeometry.MAX_ZOOM_PERCENT.toFloat(),
            onValueChange = { onStateChange(DirectorMapInteractions.setZoomPercent(state, it.toInt())) },
        )

        Text("Rollio / Dutch tilt (${state.cameraRollDegrees.toInt()}°)", style = MaterialTheme.typography.labelMedium)
        Slider(
            value = state.cameraRollDegrees,
            valueRange = -45f..45f,
            onValueChange = { onStateChange(DirectorMapInteractions.setRollDegrees(state, it)) },
        )

        MovementSelector(
            selected = state.movement,
            onSelected = { onStateChange(DirectorMapInteractions.setMovement(state, it)) },
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { onStateChange(DirectorMapInteractions.invertSides(state)) }) {
                Text("Inverti lati")
            }
            TextButton(onClick = { onStateChange(DirectorMapInteractions.reset()) }) {
                Text("Reset")
            }
        }
    }
}

@Composable
private fun DirectorMapSummary(state: DirectorMapState) {
    Text(
        text = "${state.relativeView} · ${"%.1f".format(state.cameraDistanceMeters)}m · " +
            "altezza ${state.cameraHeightDegrees.toInt()}° · ${state.movement}",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun MovementSelector(selected: CameraMovement, onSelected: (CameraMovement) -> Unit) {
    var expanded by remember { mutableStateOf(false) }

    Column {
        Text("Movimento camera", style = MaterialTheme.typography.labelMedium)
        OutlinedCard(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.outlinedCardColors(containerColor = PromptForgeColors.Card),
            border = BorderStroke(1.dp, PromptForgeColors.Border),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(selected.name, style = MaterialTheme.typography.bodyMedium)
                Text("▾", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            CameraMovement.entries.forEach { movement ->
                DropdownMenuItem(
                    text = { Text(movement.name) },
                    onClick = {
                        onSelected(movement)
                        expanded = false
                    },
                )
            }
        }
    }
}
