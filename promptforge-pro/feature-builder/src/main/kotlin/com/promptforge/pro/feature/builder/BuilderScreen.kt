package com.promptforge.pro.feature.builder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.promptforge.pro.coreui.PromptForgeCard
import com.promptforge.pro.feature.builder.steps.CameraStepContent
import com.promptforge.pro.feature.builder.steps.CharacterStepContent
import com.promptforge.pro.feature.builder.steps.LightingStepContent
import com.promptforge.pro.feature.builder.steps.OutputStepContent
import com.promptforge.pro.feature.builder.steps.ReviewStepContent
import com.promptforge.pro.feature.builder.steps.StyleStepContent
import com.promptforge.pro.feature.builder.steps.SubjectStepContent

/**
 * Il Builder è un'unica pagina scrollabile con pannelli in sequenza — come
 * PromptForge_Pro_v7.1_Guided_Studio.html, l'app HTML che l'utente usa
 * davvero e ha chiesto di portare fedelmente su Android, NON uno step wizard
 * (era così in un tentativo precedente, respinto insieme al resto del design
 * — "cancella tutto, non la voglio così"). Ogni pannello qui corrisponde a
 * un `<div class="panel">` dell'HTML, nello stesso ordine.
 */
@Composable
fun BuilderScreen(viewModel: BuilderViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        BuilderPanel(icon = "🎭", title = "Soggetto / Scena") {
            SubjectStepContent(uiState, viewModel)
        }
        BuilderPanel(icon = "🧬", title = "Consistenza personaggio") {
            CharacterStepContent(uiState, viewModel)
        }
        BuilderPanel(icon = "🎨", title = "Stile e mood") {
            StyleStepContent(uiState, viewModel)
        }
        BuilderPanel(icon = "🎥", title = "Sistema camera") {
            CameraStepContent(uiState, viewModel)
        }
        BuilderPanel(icon = "💡", title = "Luce e ambiente") {
            LightingStepContent(uiState, viewModel)
        }
        BuilderPanel(icon = "⚙️", title = "Output e generazione") {
            OutputStepContent(uiState, viewModel)
        }
        if (uiState.generatedPrompts.isNotEmpty() || uiState.savedMessage != null) {
            BuilderPanel(icon = "✨", title = "Risultati") {
                ReviewStepContent(uiState, viewModel)
            }
        }
    }
}

@Composable
private fun BuilderPanel(icon: String, title: String, content: @Composable ColumnScope.() -> Unit) {
    PromptForgeCard(modifier = Modifier.fillMaxWidth()) {
        Text(
            "$icon $title",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 14.dp),
        )
        content()
    }
}
