package com.promptforge.pro.feature.builder.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coreui.PromptForgeButton
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel
import com.promptforge.pro.feature.builder.EnumDropdown
import com.promptforge.pro.feature.builder.VariantCountStepper

/** Pannello "Output & Generazione" dell'HTML: destinazione, varianti, aspect ratio, pulsante Genera. */
@Composable
fun OutputStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
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

        PromptForgeButton(
            text = "⚡ Genera prompt",
            onClick = viewModel::generate,
            enabled = uiState.canGenerate,
            modifier = Modifier.fillMaxWidth(),
        )

        if (!uiState.canGenerate) {
            Text(
                "Scrivi almeno il prompt in inglese nel pannello Soggetto per generare.",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.error,
            )
        }
    }
}
