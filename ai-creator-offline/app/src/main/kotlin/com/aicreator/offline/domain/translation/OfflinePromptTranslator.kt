package com.aicreator.offline.domain.translation

/**
 * Traduzione IT→EN completamente offline basata su dizionario, pensata per il
 * vocabolario tipico dei prompt di generazione immagini (soggetti, stili,
 * luce, camera, qualità) — non è un modello di traduzione neurale e non
 * traduce prosa libera con grammatica complessa (vedi docs/TODO.md punto 6).
 * I prompt di generazione immagine sono tipicamente frammenti separati da
 * virgola più che frasi complete, quindi una sostituzione parola/frase con
 * dizionario copre la maggior parte dei casi reali.
 */
class OfflinePromptTranslator {

    /** Frasi multi-parola, sostituite per prime e in ordine di lunghezza decrescente per evitare match parziali errati. */
    private val phraseDictionary: Map<String, String> = mapOf(
        "capelli lunghi" to "long hair",
        "capelli corti" to "short hair",
        "occhi azzurri" to "blue eyes",
        "occhi verdi" to "green eyes",
        "occhi marroni" to "brown eyes",
        "pelle abbronzata" to "tanned skin",
        "luce naturale" to "natural light",
        "luce soffusa" to "soft light",
        "luce drammatica" to "dramatic light",
        "controluce" to "backlight",
        "ora blu" to "blue hour",
        "ora dorata" to "golden hour",
        "profondità di campo" to "depth of field",
        "sfondo sfocato" to "blurred background",
        "alta risoluzione" to "high resolution",
        "altissimo dettaglio" to "extremely detailed",
        "primo piano" to "close-up",
        "figura intera" to "full body",
        "mezzo busto" to "half body",
        "grandangolo" to "wide angle",
        "teleobiettivo" to "telephoto lens",
        "profondità cinematografica" to "cinematic depth",
        "stile realistico" to "photorealistic style",
        "stile fotografico" to "photographic style",
        "pittura a olio" to "oil painting",
        "arte digitale" to "digital art",
        "sfondo sfocato bokeh" to "bokeh background",
    )

    private val wordDictionary: Map<String, String> = mapOf(
        "donna" to "woman",
        "uomo" to "man",
        "ragazza" to "girl",
        "ragazzo" to "boy",
        "bambino" to "child",
        "persona" to "person",
        "ritratto" to "portrait",
        "volto" to "face",
        "sorriso" to "smile",
        "capelli" to "hair",
        "biondi" to "blonde",
        "bruni" to "brunette",
        "rossi" to "red",
        "ricci" to "curly",
        "lisci" to "straight",
        "occhi" to "eyes",
        "vestito" to "dress",
        "abito" to "outfit",
        "giacca" to "jacket",
        "camicia" to "shirt",
        "città" to "city",
        "strada" to "street",
        "spiaggia" to "beach",
        "montagna" to "mountain",
        "foresta" to "forest",
        "tramonto" to "sunset",
        "alba" to "sunrise",
        "notte" to "night",
        "giorno" to "day",
        "pioggia" to "rain",
        "neve" to "snow",
        "cielo" to "sky",
        "nuvole" to "clouds",
        "luce" to "light",
        "ombra" to "shadow",
        "colori" to "colors",
        "vivaci" to "vivid",
        "pastello" to "pastel",
        "caldo" to "warm",
        "freddo" to "cool",
        "dettagliato" to "detailed",
        "realistico" to "realistic",
        "fantasy" to "fantasy",
        "futuristico" to "futuristic",
        "vintage" to "vintage",
        "elegante" to "elegant",
        "moderno" to "modern",
        "antico" to "ancient",
        "fotografia" to "photography",
        "cinematografico" to "cinematic",
        "studio" to "studio",
        "esterno" to "outdoor",
        "interno" to "indoor",
        "sfondo" to "background",
        "sfocato" to "blurred",
        "nitido" to "sharp",
        "morbido" to "soft",
        "brillante" to "bright",
        "scuro" to "dark",
        "alto" to "tall",
        "basso" to "short",
        "magro" to "slim",
        "muscoloso" to "muscular",
        "bellissimo" to "beautiful",
        "bellissima" to "beautiful",
    )

    private val orderedPhraseKeys = phraseDictionary.keys.sortedByDescending { it.length }

    /**
     * Traduce quanto riconosciuto dal dizionario; i termini non presenti
     * restano invariati (meglio un prompt misto IT/EN comprensibile che un
     * buco o un errore). Preserva punteggiatura e struttura a virgole.
     */
    fun translate(prompt: String): String {
        if (prompt.isBlank()) return prompt
        var working = prompt
        for (phrase in orderedPhraseKeys) {
            working = replaceWholeWordIgnoreCase(working, phrase, phraseDictionary.getValue(phrase))
        }
        for ((it_, en) in wordDictionary) {
            working = replaceWholeWordIgnoreCase(working, it_, en)
        }
        return working
    }

    private fun replaceWholeWordIgnoreCase(text: String, target: String, replacement: String): String {
        val regex = Regex("(?<![\\p{L}])${Regex.escape(target)}(?![\\p{L}])", RegexOption.IGNORE_CASE)
        return regex.replace(text) { matchResult ->
            if (matchResult.value.firstOrNull()?.isUpperCase() == true) {
                replacement.replaceFirstChar { it.uppercase() }
            } else {
                replacement
            }
        }
    }

    /** Copertura approssimativa del dizionario per il prompt dato, utile per un avviso in UI ("traduzione parziale"). */
    fun coverageRatio(prompt: String): Float {
        val words = prompt.split(Regex("[\\s,]+")).filter { it.isNotBlank() }
        if (words.isEmpty()) return 1f
        val known = words.count { word ->
            wordDictionary.containsKey(word.lowercase().trim('.', ',', '!', '?')) ||
                phraseDictionary.keys.any { prompt.lowercase().contains(it) }
        }
        return known.toFloat() / words.size
    }
}
