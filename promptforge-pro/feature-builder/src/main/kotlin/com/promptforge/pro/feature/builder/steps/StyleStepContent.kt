package com.promptforge.pro.feature.builder.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coremodel.VisualStyle
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel
import com.promptforge.pro.feature.builder.EnumDropdown
import com.promptforge.pro.feature.builder.VariantCountStepper

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
        EnumDropdown(
            label = "Generatore di destinazione",
            selected = uiState.targetModel,
            options = TargetModel.entries,
            onSelected = viewModel::onTargetModelChange,
        )
        VariantCountStepper(count = uiState.variantCount, onCountChange = viewModel::onVariantCountChange)
        OutlinedTextField(
            value = uiState.aspectRatio,
            onValueChange = viewModel::onAspectRatioChange,
            label = { Text("Aspect ratio") },
            placeholder = { Text("Es: 1:1, 16:9, 9:16…") },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
