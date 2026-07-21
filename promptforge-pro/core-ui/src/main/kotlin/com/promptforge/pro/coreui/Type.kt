package com.promptforge.pro.coreui

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Compatta di default: il layout richiesto (§11) è denso, con pannelli stretti e
// riepilogo live sticky, quindi partiamo dalla Typography di default di Material 3
// e stringiamo solo i ruoli usati più spesso nei pannelli builder.
val PromptForgeTypography = Typography(
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 22.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyMedium = TextStyle(fontWeight = FontWeight.Normal, fontSize = 14.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp),
)
