package com.promptforge.pro.feature.builder.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coreui.PromptForgeCard
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel

/** Elenco risultati generati (§Output della pagina unica) — il pulsante Genera vive nel pannello Output. */
@Composable
fun ReviewStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        uiState.generatedPrompts.forEach { generated -> GeneratedPromptCard(generated) }

        if (uiState.canSave) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = viewModel::saveToLibrary) {
                    Text("Salva in libreria")
                }
                TextButton(onClick = viewModel::startNewPrompt) {
                    Text("Nuovo prompt")
                }
            }
        }

        uiState.savedMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun GeneratedPromptCard(generated: GeneratedPrompt) {
    val clipboard = LocalClipboardManager.current

    PromptForgeCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Variante ${generated.variantIndex + 1} · seed ${generated.seedUsed}", style = MaterialTheme.typography.labelMedium)
                TextButton(onClick = { clipboard.setText(AnnotatedString(generated.positivePrompt)) }) {
                    Text("Copia")
                }
            }
            Text(generated.positivePrompt, style = MaterialTheme.typography.bodyMedium)
            Text(
                "Negativo: ${generated.negativePrompt}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
