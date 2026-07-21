package com.promptforge.pro.coreui

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Compatta di default: il layout richiesto (§11) è denso, con pannelli stretti e
// riepilogo live sticky, quindi partiamo dalla Typography di default di Material 3
// e stringiamo solo i ruoli usati più spesso nei pannelli builder. Letter-spacing
// leggermente negativo sui titoli per una resa più pulita/moderna (non è un font
// custom — servirebbero i file del font, qui si lavora sulla scala e sulla spaziatura).
val PromptForgeTypography = Typography(
    displaySmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 30.sp, letterSpacing = (-0.5).sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 22.sp, letterSpacing = (-0.2).sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyMedium = TextStyle(fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, letterSpacing = 0.2.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp),
)
