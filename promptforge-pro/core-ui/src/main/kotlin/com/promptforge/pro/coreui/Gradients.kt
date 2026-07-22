package com.promptforge.pro.coreui

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * L'HTML di riferimento (PromptForge_Pro_v7.1_Guided_Studio.html) è
 * volutamente piatto: pannelli e bottoni sono colore pieno, mai gradiente.
 * L'unico uso di trasparenza radiale nell'originale è il cono della camera
 * nella Director Map (`fill:rgba(124,106,247,.13)`), che resta qui come
 * unico caso legittimo — non è decorazione aggiunta, è nello stesso file
 * HTML che l'utente usa ogni giorno.
 */
object PromptForgeGradients {
    fun radialGlow(color: Color): Brush = Brush.radialGradient(
        colors = listOf(color.copy(alpha = 0.20f), color.copy(alpha = 0f)),
    )
}
