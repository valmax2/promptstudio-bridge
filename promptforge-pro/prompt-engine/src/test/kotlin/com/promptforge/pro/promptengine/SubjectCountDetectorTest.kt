package com.promptforge.pro.promptengine

import org.junit.Assert.assertEquals
import org.junit.Test

class SubjectCountDetectorTest {

    @Test
    fun `singolo soggetto di default`() {
        assertEquals(1, SubjectCountDetector.detect("una donna cammina in città"))
    }

    @Test
    fun `coppia viene rilevata come 2`() {
        assertEquals(2, SubjectCountDetector.detect("una coppia adulta si abbraccia sotto la pioggia"))
    }

    @Test
    fun `numero esplicito viene rilevato`() {
        assertEquals(3, SubjectCountDetector.detect("tre amici camminano sulla spiaggia al tramonto"))
    }
}
