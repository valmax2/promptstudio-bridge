package com.promptforge.pro.feature.builder.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel
import com.promptforge.pro.feature.directormap.DirectorMapPanel

@Composable
fun CameraStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "Trascina il pallino arancione (camera) attorno a quello verde (soggetto) nella vista " +
                "dall'alto per scegliere l'angolazione; nella vista laterale, sotto, per scegliere " +
                "l'altezza — dal basso verso l'alto, come un drone.",
            style = MaterialTheme.typography.bodyMedium,
        )
        DirectorMapPanel(state = uiState.directorMap, onStateChange = viewModel::onDirectorMapChange)
    }
}
