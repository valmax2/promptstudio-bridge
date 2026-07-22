package com.aicreator.offline.domain.model

import org.junit.Assert.assertThrows
import org.junit.Test

class GenerationParamsTest {

    @Test
    fun `prompt positivo vuoto viene rifiutato`() {
        assertThrows(IllegalArgumentException::class.java) {
            GenerationParams(positivePrompt = "", modelId = "model-1")
        }
    }

    @Test
    fun `passi fuori intervallo vengono rifiutati`() {
        assertThrows(IllegalArgumentException::class.java) {
            GenerationParams(positivePrompt = "x", modelId = "m", steps = 0)
        }
        assertThrows(IllegalArgumentException::class.java) {
            GenerationParams(positivePrompt = "x", modelId = "m", steps = 100)
        }
    }

    @Test
    fun `cfg fuori intervallo viene rifiutato`() {
        assertThrows(IllegalArgumentException::class.java) {
            GenerationParams(positivePrompt = "x", modelId = "m", cfgScale = 0.5f)
        }
    }

    @Test
    fun `seed esplicito viene preservato`() {
        val params = GenerationParams(positivePrompt = "x", modelId = "m", seed = 42L)
        assert(params.effectiveSeed == 42L)
    }
}
