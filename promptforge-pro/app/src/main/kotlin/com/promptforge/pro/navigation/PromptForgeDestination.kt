package com.promptforge.pro.navigation

/**
 * Le sezioni raggiungibili dalla bottom bar. Soluzione transitoria: il
 * documento v7 chiede una vera Home con percorsi separati Immagine/Video/
 * Scheda Personaggio/Impostazioni — arriva con la ristrutturazione a 8 step,
 * non ancora fatta. Per ora "Personaggi" è una tab in più, come le altre.
 */
enum class PromptForgeDestination(val route: String, val label: String) {
    Builder(route = "builder", label = "Builder"),
    Characters(route = "characters", label = "Personaggi"),
    Library(route = "library", label = "Libreria"),
    Presets(route = "presets", label = "Preset"),
    Settings(route = "settings", label = "Impostazioni"),
}
