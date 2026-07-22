package com.promptforge.pro.coreui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = PromptForgeColors.Violet,
    primaryContainer = PromptForgeColors.VioletDark,
    secondary = PromptForgeColors.Green,
    tertiary = PromptForgeColors.Orange,
    background = PromptForgeColors.Background,
    surface = PromptForgeColors.Card,
    surfaceVariant = PromptForgeColors.Card2,
    onBackground = PromptForgeColors.Text,
    onSurface = PromptForgeColors.Text,
    onSurfaceVariant = PromptForgeColors.Muted2,
    outline = PromptForgeColors.Border2,
    error = PromptForgeColors.Error,
)

// Il prototipo e il master prompt richiedono un tema dark "premium" come esperienza
// primaria; una light scheme di cortesia resta disponibile per chi la preferisce/per
// accessibilità, ma non è quella su cui il design è stato pensato.
private val LightColors = lightColorScheme(
    primary = PromptForgeColors.Violet,
    secondary = PromptForgeColors.Green,
    tertiary = PromptForgeColors.Orange,
)

/**
 * Colore associato alla modalità adulti (§6, §11): usato solo per il toggle/badge
 * della UI, mai per contenuti generati.
 */
val AdultModeAccent = PromptForgeColors.Pink

@Composable
fun PromptForgeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colorScheme,
        typography = PromptForgeTypography,
        shapes = PromptForgeShapes,
        content = content,
    )
}
