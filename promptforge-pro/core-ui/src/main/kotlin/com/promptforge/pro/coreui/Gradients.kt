package com.promptforge.pro.coreui

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Gradienti del design system. Usati con criterio, non ovunque: solo le
 * azioni primarie e il "palco" della Director Map li usano — se tutto
 * brilla, non spicca più niente (gerarchia visiva, non decorazione).
 */
object PromptForgeGradients {
    val PrimaryButton = Brush.linearGradient(
        colors = listOf(Color(0xFFA78BFA), PromptForgeColors.Violet, Color(0xFF6D28D9)),
    )

    val DisabledButton = Brush.linearGradient(
        colors = listOf(PromptForgeColors.SurfaceVariant, PromptForgeColors.SurfaceVariant),
    )

    val DangerButton = Brush.linearGradient(
        colors = listOf(Color(0xFFFCA5A5), PromptForgeColors.Error),
    )

    /**
     * Sfondo "palco": un fascio di luce soffuso al centro che sfuma nel buio ai
     * bordi (come un set con un solo faro puntato al centro). `center`/`radius`
     * non specificati: Compose li deduce dal riquadro su cui il brush è
     * applicato (centro del riquadro, raggio fino all'angolo più lontano).
     */
    val StageBackground = Brush.radialGradient(
        colors = listOf(
            PromptForgeColors.SurfaceVariant,
            PromptForgeColors.Surface,
            PromptForgeColors.Background,
        ),
    )

    fun radialGlow(color: Color): Brush = Brush.radialGradient(
        colors = listOf(color.copy(alpha = 0.55f), color.copy(alpha = 0f)),
    )
}
