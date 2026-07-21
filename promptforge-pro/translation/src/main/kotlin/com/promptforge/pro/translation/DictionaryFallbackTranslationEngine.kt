package com.promptforge.pro.translation

import javax.inject.Inject

/**
 * §4 punto 2: "dizionario locale di emergenza per termini tipici dei prompt".
 * Sostituzione parola-per-parola, non è una vera traduzione automatica: serve
 * a dare all'utente una bozza di partenza sempre modificabile (§4: "testo
 * inglese sempre modificabile"), non un risultato rifinito. Le implementazioni
 * migliori (ML Kit on-device, LibreTranslate, Ollama — §4 punti 1/3/4) restano
 * da fare in una fase futura; questa è l'unica oggi disponibile, quindi è
 * anche quella di default.
 */
class DictionaryFallbackTranslationEngine @Inject constructor() : TranslationEngine {

    override suspend fun translateItalianToEnglish(text: String): TranslationResult {
        if (text.isBlank()) return TranslationResult.Success(englishText = "", isApproximate = true)

        val translatedWords = Regex("[\\p{L}]+|[^\\p{L}]+").findAll(text).map { match ->
            val token = match.value
            val lower = token.lowercase()
            val translation = Dictionary[lower] ?: return@map token
            matchCapitalization(original = token, translated = translation)
        }.joinToString("")

        return TranslationResult.Success(englishText = translatedWords, isApproximate = true)
    }

    private fun matchCapitalization(original: String, translated: String): String =
        if (original.isNotEmpty() && original[0].isUpperCase()) {
            translated.replaceFirstChar { it.uppercase() }
        } else {
            translated
        }

    private companion object {
        // Vocabolario volutamente piccolo: termini ricorrenti in descrizioni di
        // scena (soggetti, azioni, ambienti, meteo, tempo, colori), non un
        // dizionario generico completo.
        val Dictionary: Map<String, String> = mapOf(
            "un" to "a", "uno" to "a", "una" to "a", "il" to "the", "lo" to "the",
            "la" to "the", "i" to "the", "gli" to "the", "le" to "the",
            "e" to "and", "o" to "or", "con" to "with", "senza" to "without",
            "in" to "in", "su" to "on", "sotto" to "under", "sopra" to "above",
            "tra" to "between", "vicino" to "near", "lontano" to "far",
            "donna" to "woman", "uomo" to "man", "ragazza" to "girl", "ragazzo" to "boy",
            "bambino" to "child", "bambina" to "child", "coppia" to "couple",
            "gruppo" to "group", "amici" to "friends", "persona" to "person",
            "gatto" to "cat", "cane" to "dog", "cavallo" to "horse", "uccello" to "bird",
            "cammina" to "walks", "camminando" to "walking", "corre" to "runs",
            "correndo" to "running", "salta" to "jumps", "saltando" to "jumping",
            "siede" to "sits", "seduto" to "seated", "seduta" to "seated",
            "balla" to "dances", "ballando" to "dancing", "guarda" to "looks",
            "sorride" to "smiles", "abbraccia" to "embraces", "bacia" to "kisses",
            "città" to "city", "strada" to "street", "foresta" to "forest",
            "mare" to "sea", "spiaggia" to "beach", "montagna" to "mountain",
            "casa" to "house", "stanza" to "room", "giardino" to "garden",
            "parco" to "park", "notte" to "night", "giorno" to "day",
            "mattina" to "morning", "sera" to "evening", "tramonto" to "sunset",
            "alba" to "dawn", "pioggia" to "rain", "neve" to "snow", "sole" to "sun",
            "nuvole" to "clouds", "vento" to "wind", "nebbia" to "fog",
            "rosso" to "red", "blu" to "blue", "verde" to "green", "giallo" to "yellow",
            "nero" to "black", "bianco" to "white", "viola" to "purple",
            "arancione" to "orange", "rosa" to "pink", "grigio" to "gray",
            "grande" to "large", "piccolo" to "small", "bello" to "beautiful",
            "bella" to "beautiful", "vecchio" to "old", "giovane" to "young",
            "luminoso" to "bright", "buio" to "dark", "elegante" to "elegant",
            "illuminata" to "lit", "illuminato" to "lit", "neon" to "neon",
        )
    }
}
