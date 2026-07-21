package com.promptforge.pro.coreui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Bottone per **azioni primarie soltanto** (una per schermata, di norma):
 * gradiente + glow colorato. Per tutto il resto — annulla, indietro, azioni
 * secondarie — restano i bottoni Material standard, sobri apposta: se ogni
 * pulsante brillasse allo stesso modo, nessuno spiccherebbe più (è la stessa
 * ragione per cui un cartellone pubblicitario non mette tutto in maiuscolo).
 */
@Composable
fun PromptForgeButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    brush: Brush = PromptForgeGradients.PrimaryButton,
    glowColor: Color = PromptForgeColors.Violet,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent,
        modifier = modifier
            .shadow(
                elevation = if (enabled) 14.dp else 0.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = glowColor,
                spotColor = glowColor,
            ),
    ) {
        Box(
            modifier = Modifier
                .background(if (enabled) brush else PromptForgeGradients.DisabledButton)
                .padding(horizontal = 24.dp, vertical = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = text,
                color = if (enabled) Color.White else LocalContentColor.current.copy(alpha = 0.5f),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
