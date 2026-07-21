package com.promptforge.pro.coreui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Forme più arrotondate del default Material3, dichiarate una sola volta a
 * livello di tema: ogni `Card`, `TextField`, `Surface`, `DropdownMenu`,
 * dialog ecc. le eredita automaticamente da qui, senza doverle impostare
 * componente per componente — è così che l'aspetto "morbido, coerente"
 * arriva a tutta l'app invece che solo dove qualcuno se ne ricorda.
 */
val PromptForgeShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
)
