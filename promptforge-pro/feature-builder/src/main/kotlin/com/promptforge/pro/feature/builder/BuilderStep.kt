package com.promptforge.pro.feature.builder

/**
 * Il Builder è un percorso guidato, non un modulo unico da scorrere (era così
 * nella prima versione — segnalato come confuso: la Director Map compariva
 * in mezzo a un lungo elenco di campi senza contesto). Ogni step ha uno scopo
 * chiaro; l'utente avanza/torna indietro invece di orientarsi in una pagina
 * sola con tutto insieme.
 */
enum class BuilderStep(val title: String, val subtitle: String) {
    Subject(
        title = "Soggetto",
        subtitle = "Cosa vuoi generare, in italiano",
    ),
    Character(
        title = "Personaggio",
        subtitle = "Facoltativo: una foto di riferimento per mantenere lo stesso volto",
    ),
    Camera(
        title = "Camera",
        subtitle = "Trascina i due pallini per scegliere angolazione e altezza",
    ),
    Lighting(
        title = "Luce e ambiente",
        subtitle = "Dove e quando è ambientata la scena",
    ),
    Style(
        title = "Stile e output",
        subtitle = "Per quale generatore, quante varianti",
    ),
    Review(
        title = "Riepilogo",
        subtitle = "Genera e salva",
    ),
}
