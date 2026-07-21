package com.promptforge.pro.promptengine

/**
 * Banche lessicali separate per dimensione di variazione (§7: "Usare banche
 * lessicali separate per: ritmo visivo; micro-dettagli; atmosfera;
 * prospettiva e lente; direzione editoriale"). Le variazioni tra varianti
 * toccano solo resa/regia, mai la storia (§7, criterio di accettazione #2).
 */
internal object VariantLexicon {
    val visualRhythm = listOf(
        "dynamic diagonal composition",
        "balanced symmetrical framing",
        "off-center rule-of-thirds framing",
        "layered foreground-background composition",
    )
    val microDetails = listOf(
        "fine fabric texture detail",
        "subtle skin pore detail",
        "crisp hair strand detail",
        "delicate light reflections on surfaces",
    )
    val atmosphere = listOf(
        "moody atmospheric haze",
        "crisp clear air",
        "soft ambient diffusion",
        "dramatic high-contrast atmosphere",
    )
    val perspective = listOf(
        "eye-level perspective",
        "slightly low-angle perspective",
        "slightly high-angle perspective",
        "wide-angle perspective",
    )
    val editorialDirection = listOf(
        "editorial fashion direction",
        "documentary candid direction",
        "cinematic film-still direction",
        "fine-art portrait direction",
    )
}
