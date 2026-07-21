package com.promptforge.pro.promptengine

/**
 * Stima quanti soggetti compaiono nel testo sorgente italiano (§13: test di
 * "rilevamento multi-soggetto"). Serve come suggerimento per la UI, non
 * modifica mai il testo: il motore prompt non altera il numero di soggetti
 * descritti dall'utente (§7).
 */
object SubjectCountDetector {
    private val numberWords = mapOf(
        "due" to 2, "tre" to 3, "quattro" to 4, "cinque" to 5, "sei" to 6,
    )
    private val pluralHints = listOf(
        Regex("(?i)\\bcoppia\\b") to 2,
        Regex("(?i)\\bgruppo\\b") to 3,
        Regex("(?i)\\bamici\\b") to 3,
    )

    /** Stima best-effort del numero di soggetti; 1 se non trova indizi di pluralità. */
    fun detect(sourceText: String): Int {
        val words = Regex("[\\p{L}]+").findAll(sourceText.lowercase()).map { it.value }.toList()
        val numberWordMatch = words.firstNotNullOfOrNull { numberWords[it] }
        if (numberWordMatch != null) return numberWordMatch

        val hintMatch = pluralHints.firstOrNull { (pattern, _) -> pattern.containsMatchIn(sourceText) }
        if (hintMatch != null) return hintMatch.second

        return 1
    }
}
