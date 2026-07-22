package com.aicreator.offline.domain.translation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflinePromptTranslatorTest {

    private val translator = OfflinePromptTranslator()

    @Test
    fun `traduce parole singole conosciute`() {
        val result = translator.translate("donna con capelli lunghi al tramonto")
        assertTrue(result.contains("woman"))
        assertTrue(result.contains("long hair"))
        assertTrue(result.contains("sunset"))
    }

    @Test
    fun `preserva maiuscola iniziale`() {
        val result = translator.translate("Ritratto di una donna")
        assertTrue(result.startsWith("Portrait"))
    }

    @Test
    fun `non tocca parole non presenti nel dizionario`() {
        val result = translator.translate("xyzabc123")
        assertEquals("xyzabc123", result)
    }

    @Test
    fun `prompt vuoto resta vuoto`() {
        assertEquals("", translator.translate(""))
    }

    @Test
    fun `non sostituisce sottostringhe parziali`() {
        // "uomo" non deve corrompere una parola più lunga che lo contiene.
        val result = translator.translate("preuomotest")
        assertEquals("preuomotest", result)
    }
}
