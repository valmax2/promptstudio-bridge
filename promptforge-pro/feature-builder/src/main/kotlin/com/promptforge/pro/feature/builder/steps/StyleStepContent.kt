package com.promptforge.pro.feature.builder.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.VisualStyle
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel
import com.promptforge.pro.feature.builder.EnumDropdown

/** Solo stile visivo e mood — destinazione/varianti/aspect ratio sono nel pannello Output (§Output & Generazione dell'HTML). */
@Composable
fun StyleStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        EnumDropdown(
            label = "Stile visivo",
            selected = uiState.visualStyle,
            options = VisualStyle.entries,
            onSelected = viewModel::onVisualStyleChange,
        )
        OutlinedTextField(
            value = uiState.mood,
            onValueChange = viewModel::onMoodChange,
            label = { Text("Mood (opzionale)") },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
