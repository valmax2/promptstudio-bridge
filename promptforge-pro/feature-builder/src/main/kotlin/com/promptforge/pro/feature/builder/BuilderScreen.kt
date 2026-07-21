package com.promptforge.pro.feature.builder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coremodel.TargetModel
import com.promptforge.pro.coremodel.VisualStyle
import com.promptforge.pro.feature.directormap.DirectorMapPanel

@Composable
fun BuilderScreen(viewModel: BuilderViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Soggetto / Scena", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            value = uiState.italianText,
            onValueChange = viewModel::onItalianTextChange,
            label = { Text("Descrizione in italiano") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
        )

        Button(onClick = viewModel::translate, enabled = uiState.italianText.isNotBlank() && !uiState.isTranslating) {
            Text(if (uiState.isTranslating) "Traduzione…" else "Traduci (bozza — dizionario base)")
        }

        OutlinedTextField(
            value = uiState.englishText,
            onValueChange = viewModel::onEnglishTextChange,
            label = { Text("Prompt in inglese (modificabile)") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
        )

        uiState.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        HorizontalDivider()

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
            label = "Modello di destinazione",
            selected = uiState.targetModel,
            options = TargetModel.entries,
            onSelected = viewModel::onTargetModelChange,
        )

        VariantCountStepper(count = uiState.variantCount, onCountChange = viewModel::onVariantCountChange)

        HorizontalDivider()

        Text("Camera", style = MaterialTheme.typography.titleMedium)
        DirectorMapPanel(state = uiState.directorMap, onStateChange = viewModel::onDirectorMapChange)

        HorizontalDivider()

        Button(onClick = viewModel::generate, enabled = uiState.canGenerate) {
            Text("Genera prompt")
        }

        uiState.generatedPrompts.forEach { generated ->
            GeneratedPromptCard(generated)
        }

        if (uiState.canSave) {
            OutlinedButton(onClick = viewModel::saveToLibrary) {
                Text("Salva in libreria")
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

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
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

@Composable
private fun VariantCountStepper(count: Int, onCountChange: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Numero varianti", style = MaterialTheme.typography.labelMedium)
        OutlinedButton(onClick = { onCountChange(count - 1) }, enabled = count > 1) { Text("−") }
        Text(count.toString(), style = MaterialTheme.typography.bodyMedium)
        OutlinedButton(onClick = { onCountChange(count + 1) }, enabled = count < 8) { Text("+") }
    }
}

@Composable
private fun <T : Enum<T>> EnumDropdown(label: String, selected: T, options: List<T>, onSelected: (T) -> Unit) {
    var expanded by remember { mutableStateOf(false) }

    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Button(onClick = { expanded = true }) {
            Text(selected.name)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.name) },
                    onClick = {
                        onSelected(option)
                        expanded = false
                    },
                )
            }
        }
    }
}
