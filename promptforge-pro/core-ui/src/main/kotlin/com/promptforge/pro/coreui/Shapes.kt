package com.promptforge.pro.coreui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Stessi raggi dell'HTML di riferimento (--radius-sm:6px, --radius:8px,
 * --radius-lg:12px) — angoli piccoli e piatti, non gli arrotondamenti
 * pronunciati di un precedente tentativo di design "premium" che l'utente
 * ha respinto perché non corrispondeva all'app che usa davvero.
 */
val PromptForgeShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(12.dp),
)

/** Raggi grezzi per componenti che non passano dal tema Material (chip, bottoni custom). */
object PromptForgeRadius {
    val Small = RoundedCornerShape(6.dp)
    val Medium = RoundedCornerShape(8.dp)
    val Large = RoundedCornerShape(12.dp)
    val Pill = RoundedCornerShape(20.dp)
}
