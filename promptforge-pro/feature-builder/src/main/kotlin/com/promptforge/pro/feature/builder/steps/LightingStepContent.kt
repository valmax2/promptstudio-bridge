package com.promptforge.pro.feature.builder.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.promptforge.pro.feature.builder.BuilderUiState
import com.promptforge.pro.feature.builder.BuilderViewModel

@Composable
fun LightingStepContent(uiState: BuilderUiState, viewModel: BuilderViewModel) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(
            value = uiState.lightingStyle,
            onValueChange = viewModel::onLightingStyleChange,
            label = { Text("Illuminazione") },
            placeholder = { Text("Es: soft natural light, neon, golden hour…") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.timeOfDay,
            onValueChange = viewModel::onTimeOfDayChange,
            label = { Text("Momento della giornata") },
            placeholder = { Text("Es: day, night, sunset…") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.environmentSetting,
            onValueChange = viewModel::onEnvironmentSettingChange,
            label = { Text("Ambientazione (opzionale)") },
            placeholder = { Text("Es: strada di città, foresta, spiaggia…") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.environmentWeather,
            onValueChange = viewModel::onEnvironmentWeatherChange,
            label = { Text("Meteo (opzionale)") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = uiState.environmentColorGrading,
            onValueChange = viewModel::onEnvironmentColorGradingChange,
            label = { Text("Color grading (opzionale)") },
            placeholder = { Text("Es: teal and orange, desaturated, warm film…") },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
