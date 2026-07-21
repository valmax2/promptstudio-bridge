package com.promptforge.pro.feature.builder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.promptforge.pro.coreui.PromptForgeButton
import com.promptforge.pro.coreui.PromptForgeGradients
import com.promptforge.pro.feature.builder.steps.CameraStepContent
import com.promptforge.pro.feature.builder.steps.CharacterStepContent
import com.promptforge.pro.feature.builder.steps.LightingStepContent
import com.promptforge.pro.feature.builder.steps.ReviewStepContent
import com.promptforge.pro.feature.builder.steps.StyleStepContent
import com.promptforge.pro.feature.builder.steps.SubjectStepContent

/**
 * Il Builder è un wizard a 6 step (vedi [BuilderStep]), non più un'unica
 * schermata con tutti i controlli in fila: intestazione con lo step
 * corrente, contenuto dello step, barra Indietro/Avanti in basso.
 */
@Composable
fun BuilderScreen(viewModel: BuilderViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        BuilderStepHeader(uiState = uiState, onStepClick = viewModel::goToStep)
        HorizontalDivider()

        Box(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            when (uiState.currentStep) {
                BuilderStep.Subject -> SubjectStepContent(uiState, viewModel)
                BuilderStep.Character -> CharacterStepContent(uiState, viewModel)
                BuilderStep.Camera -> CameraStepContent(uiState, viewModel)
                BuilderStep.Lighting -> LightingStepContent(uiState, viewModel)
                BuilderStep.Style -> StyleStepContent(uiState, viewModel)
                BuilderStep.Review -> ReviewStepContent(uiState, viewModel)
            }
        }

        HorizontalDivider()
        BuilderBottomNav(uiState = uiState, viewModel = viewModel)
    }
}

@Composable
private fun BuilderStepHeader(uiState: BuilderUiState, onStepClick: (BuilderStep) -> Unit) {
    val steps = BuilderStep.entries
    val currentIndex = steps.indexOf(uiState.currentStep)

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(
            "Step ${currentIndex + 1} di ${steps.size} · ${uiState.currentStep.title}",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Text(uiState.currentStep.subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

        Row(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            steps.forEachIndexed { index, step ->
                val reachedOrCurrent = index <= currentIndex
                val brush = if (reachedOrCurrent) {
                    PromptForgeGradients.PrimaryButton
                } else {
                    SolidColor(MaterialTheme.colorScheme.surfaceVariant)
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .clip(CircleShape)
                        .background(brush),
                )
            }
        }
    }
}

@Composable
private fun BuilderBottomNav(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    val steps = BuilderStep.entries
    val isFirstStep = uiState.currentStep == steps.first()
    val isLastStep = uiState.currentStep == steps.last()

    Row(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        TextButton(onClick = viewModel::goToPreviousStep, enabled = !isFirstStep) {
            Text("Indietro")
        }

        if (!isLastStep) {
            PromptForgeButton(
                text = if (uiState.currentStep == BuilderStep.Character && !uiState.characterEnabled) "Salta" else "Avanti",
                onClick = viewModel::goToNextStep,
                enabled = uiState.canLeaveStep(uiState.currentStep),
            )
        }
    }
}
