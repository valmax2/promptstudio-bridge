package com.promptforge.pro.feature.builder.steps

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.SubjectMode
import com.promptforge.pro.coreui.PromptForgeButton
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel
import com.promptforge.pro.feature.builder.EnumDropdown
import com.promptforge.pro.speech.SpeechState

@Composable
fun SubjectStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    val requestMicPermission = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted -> if (granted) viewModel.startDictation() }

    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(
            value = uiState.italianText,
            onValueChange = viewModel::onItalianTextChange,
            label = { Text("Descrivi la scena in italiano") },
            placeholder = { Text("Es: una donna cammina in una strada di città al tramonto") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
        )

        DictationButton(
            speechState = uiState.speechState,
            onStart = { requestMicPermission.launch(Manifest.permission.RECORD_AUDIO) },
            onStop = viewModel::stopDictation,
        )

        PromptForgeButton(
            text = if (uiState.isTranslating) "Traduzione…" else "Traduci (bozza)",
            onClick = viewModel::translate,
            enabled = uiState.italianText.isNotBlank() && !uiState.isTranslating,
        )

        Text(
            "La traduzione è una bozza col dizionario di base, non un motore di traduzione vero — " +
                "modifica pure il testo inglese qui sotto a mano, resta sempre lui quello usato.",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        OutlinedTextField(
            value = uiState.englishText,
            onValueChange = viewModel::onEnglishTextChange,
            label = { Text("Prompt in inglese") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
        )

        uiState.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        EnumDropdown(
            label = "Soggetti nella scena",
            selected = uiState.subjectMode,
            options = SubjectMode.entries,
            onSelected = viewModel::onSubjectModeChange,
        )

        if (uiState.englishText.isBlank()) {
            Text(
                "Scrivi almeno il prompt in inglese per poter generare.",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.error,
            )
        }
    }
}

@Composable
private fun DictationButton(speechState: SpeechState, onStart: () -> Unit, onStop: () -> Unit) {
    Column {
        when (speechState) {
            is SpeechState.Idle -> OutlinedButton(onClick = onStart) { Text("🎤 Detta la descrizione") }
            is SpeechState.Listening -> OutlinedButton(onClick = onStop) { Text("🎤 In ascolto… tocca per fermare") }
            is SpeechState.Processing -> OutlinedButton(onClick = {}, enabled = false) { Text("Elaborazione…") }
            is SpeechState.Error -> {
                OutlinedButton(onClick = onStart) { Text("🎤 Detta la descrizione") }
                Text(
                    speechState.message,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}
