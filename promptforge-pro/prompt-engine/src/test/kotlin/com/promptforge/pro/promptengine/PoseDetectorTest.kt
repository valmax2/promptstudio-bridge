package com.promptforge.pro.promptengine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PoseDetectorTest {

    @Test
    fun `rileva l'abbraccio nel testo del criterio di accettazione numero 1`() {
        val text = "una coppia adulta si abbraccia sotto la pioggia in una strada illuminata al neon"

        val pose = PoseDetector.detect(text)

        assertEquals("embracing pose, arms wrapped around each other", pose)
    }

    @Test
    fun `nessuna azione riconosciuta ritorna null`() {
        val pose = PoseDetector.detect("un gatto arancione seduto su un davanzale al tramonto".let {
            // rimuovo "seduto" per testare davvero il caso "nessuna corrispondenza"
            it.replace("seduto", "presente")
        })

        assertNull(pose)
    }

    @Test
    fun `rileva la corsa`() {
        assertEquals(
            "mid-run dynamic pose, motion blur on legs",
            PoseDetector.detect("un ragazzo corre lungo la spiaggia"),
        )
    }
}
