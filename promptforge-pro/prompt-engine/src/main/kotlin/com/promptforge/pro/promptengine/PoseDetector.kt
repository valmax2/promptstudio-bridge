package com.promptforge.pro.promptengine

/**
 * Rilevamento posa/azione dal testo sorgente italiano (§7: "selezione
 * automatica della posa quando il testo contiene un'azione esplicita",
 * criterio di accettazione #1). Euristica a pattern, non un modello NLP:
 * volutamente semplice e verificabile, in attesa di un motore migliore in
 * una fase futura se servisse più copertura.
 */
object PoseDetector {
    private val actionPatterns: List<Pair<Regex, String>> = listOf(
        Regex("(?i)\\babbracc") to "embracing pose, arms wrapped around each other",
        Regex("(?i)\\bbaci") to "kissing pose, faces close together",
        Regex("(?i)\\bcorr") to "mid-run dynamic pose, motion blur on legs",
        Regex("(?i)\\bsalt") to "mid-jump pose, airborne",
        Regex("(?i)\\bsed") to "seated pose",
        Regex("(?i)\\bcammin") to "walking pose",
        Regex("(?i)\\bball") to "dancing pose, dynamic body line",
        Regex("(?i)\\bguard") to "looking toward camera, direct gaze",
    )

    /** Ritorna la prima posa riconosciuta nel testo, oppure null se nessuna corrisponde. */
    fun detect(sourceText: String): String? =
        actionPatterns.firstOrNull { (pattern, _) -> pattern.containsMatchIn(sourceText) }?.second
}
