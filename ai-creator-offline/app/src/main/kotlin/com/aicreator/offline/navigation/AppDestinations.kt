package com.aicreator.offline.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBox
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Tune
import androidx.compose.ui.graphics.vector.ImageVector

/** Le 12 schermate principali richieste, con etichetta in italiano e icona per la navigazione. */
enum class AppDestination(val route: String, val label: String, val icon: ImageVector, val inBottomBar: Boolean) {
    HOME("home", "Home", Icons.Filled.Home, true),
    GENERATE("generate", "Genera", Icons.Filled.Photo, true),
    CHARACTER("character", "Personaggio", Icons.Filled.Person, true),
    FACE("face", "Volto", Icons.Filled.Face, false),
    FULL_BODY("full_body", "Full Body", Icons.Filled.AccountBox, false),
    MODELS("models", "Modelli", Icons.Filled.Storage, true),
    LORA("lora", "LoRA e adattatori", Icons.Filled.Tune, false),
    PRESETS("presets", "Preset", Icons.Filled.Tune, false),
    HISTORY("history", "Cronologia", Icons.Filled.History, false),
    GALLERY("gallery", "Galleria privata", Icons.Filled.PhotoLibrary, true),
    DIAGNOSTICS("diagnostics", "Diagnostica dispositivo", Icons.Filled.Memory, false),
    SETTINGS("settings", "Impostazioni e privacy", Icons.Filled.Settings, false),
    ;

    companion object {
        fun fromRoute(route: String?): AppDestination? = entries.firstOrNull { it.route == route }
    }
}

const val LOCK_ROUTE = "lock"
