package com.aicreator.offline.ui.screens.fullbody

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aicreator.offline.AppContainer

@Composable
fun FullBodyModeScreen(container: AppContainer, onDone: () -> Unit) {
    val selection by container.characterSelectionHolder.selection.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text("Figura intera e full body", style = MaterialTheme.typography.titleLarge)
        Text(container.fullBodyConditioning.techniqueDescription, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 8.dp))

        val current = selection
        if (current == null || current.imagePath == null) {
            Text(
                "Nessuna foto di riferimento selezionata. Vai su \"Personaggio\" e scegli \"Usa: Full Body\" su un personaggio salvato.",
                modifier = Modifier.padding(top = 16.dp),
            )
            return@Column
        }

        val bitmap = remember(current.imagePath) { BitmapFactory.decodeFile(current.imagePath)?.asImageBitmap() }
        bitmap?.let { Image(it, contentDescription = null, modifier = Modifier.size(160.dp).padding(top = 16.dp)) }

        Text("Intensità riferimento: ${"%.2f".format(current.referenceStrength)}", modifier = Modifier.padding(top = 16.dp))
        Slider(
            value = current.referenceStrength,
            onValueChange = { container.characterSelectionHolder.update(current.copy(referenceStrength = it)) },
        )
        Text("Intensità coerenza volto: ${"%.2f".format(current.faceConsistencyStrength)}")
        Slider(
            value = current.faceConsistencyStrength,
            onValueChange = { container.characterSelectionHolder.update(current.copy(faceConsistencyStrength = it)) },
        )

        Button(onClick = onDone, modifier = Modifier.padding(top = 16.dp)) { Text("Vai a Genera") }
    }
}
