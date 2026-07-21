package com.promptforge.pro.coreui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedCard
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Card standard di tutta l'app: bordo sottile invece dell'ombra piatta di
 * default, superficie leggermente più chiara dello sfondo. Va usata al posto
 * di `Card`/`OutlinedCard` di Material dovunque nell'app, per coerenza.
 */
@Composable
fun PromptForgeCard(
    modifier: Modifier = Modifier,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    OutlinedCard(
        modifier = modifier,
        colors = CardDefaults.outlinedCardColors(containerColor = PromptForgeColors.SurfaceVariant),
        border = BorderStroke(1.dp, PromptForgeColors.Border),
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
}
