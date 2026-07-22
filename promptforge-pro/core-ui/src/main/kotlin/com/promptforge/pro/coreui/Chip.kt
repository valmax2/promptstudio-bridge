package com.promptforge.pro.coreui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class ChipShapeStyle { Square, Pill }

/**
 * Chip selezionabile identica a `.chip`/`.chip.on` dell'HTML di riferimento:
 * spento = card2 piatta con testo attenuato, acceso = sfondo accent-bg
 * trasparente + bordo accent + testo pieno. Nessun glow, nessuna ombra.
 *
 * [ChipShapeStyle.Pill] copre le varianti a pillola dell'HTML (`.mood-chip`,
 * `.preserve-chip`): stesso comportamento on/off, bordo arrotondato a 20dp e
 * sfondo trasparente da spenta invece di card2.
 */
@Composable
fun PromptForgeChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    shapeStyle: ChipShapeStyle = ChipShapeStyle.Square,
) {
    val shape = if (shapeStyle == ChipShapeStyle.Pill) PromptForgeRadius.Pill else PromptForgeRadius.Medium
    val background = when {
        selected -> PromptForgeColors.VioletBg
        shapeStyle == ChipShapeStyle.Pill -> androidx.compose.ui.graphics.Color.Transparent
        else -> PromptForgeColors.Card2
    }
    val borderColor = if (selected) PromptForgeColors.Violet else PromptForgeColors.Border
    val textColor = if (selected) PromptForgeColors.Text else PromptForgeColors.Muted2

    Surface(
        onClick = onClick,
        shape = shape,
        color = background,
        border = BorderStroke(1.dp, borderColor),
        modifier = modifier,
    ) {
        Text(
            text = label,
            color = textColor,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
    }
}
