package com.promptforge.pro.coreui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class PromptForgeButtonStyle { Primary, Secondary }

/**
 * Bottone piatto, come `.go` (primario, sfondo viola pieno) e `.cbtn`
 * (secondario, sfondo card + bordo) nell'HTML di riferimento — niente
 * gradienti né glow: quello stile è stato esplicitamente respinto perché non
 * corrispondeva all'app che l'utente usa davvero.
 */
@Composable
fun PromptForgeButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    style: PromptForgeButtonStyle = PromptForgeButtonStyle.Primary,
) {
    val background = when {
        !enabled -> PromptForgeColors.Card2
        style == PromptForgeButtonStyle.Primary -> PromptForgeColors.Violet
        else -> PromptForgeColors.Card
    }
    val textColor = when {
        !enabled -> LocalContentColor.current.copy(alpha = 0.4f)
        style == PromptForgeButtonStyle.Primary -> Color.White
        else -> PromptForgeColors.Text
    }
    val border = if (style == PromptForgeButtonStyle.Secondary) {
        BorderStroke(1.dp, PromptForgeColors.Border2)
    } else {
        null
    }

    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = PromptForgeRadius.Medium,
        color = Color.Transparent,
        border = border,
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .background(background)
                .padding(horizontal = 20.dp, vertical = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = text,
                color = textColor,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (style == PromptForgeButtonStyle.Primary) FontWeight.Bold else FontWeight.Medium,
            )
        }
    }
}
