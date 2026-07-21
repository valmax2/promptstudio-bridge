package com.promptforge.pro.navigation

/**
 * Le 4 sezioni principali dell'app (§2 del master prompt). La Director Map (§3)
 * non è una destinazione di primo livello: vive dentro il Builder come pannello
 * del sistema camera.
 */
enum class PromptForgeDestination(val route: String, val label: String) {
    Builder(route = "builder", label = "Builder"),
    Library(route = "library", label = "Libreria"),
    Presets(route = "presets", label = "Preset"),
    Settings(route = "settings", label = "Impostazioni"),
}
