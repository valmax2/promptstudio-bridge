package com.promptforge.pro.promptengine

import com.promptforge.pro.coremodel.NegativePromptConfig
import com.promptforge.pro.coremodel.OutputConfig
import com.promptforge.pro.coremodel.PromptDraft
import com.promptforge.pro.coremodel.PromptRequest
import com.promptforge.pro.coremodel.TargetModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DefaultPromptEngineTest {

    private val engine = DefaultPromptEngine(clockMillis = { 1_700_000_000_000L })

    private fun requestFor(
        englishText: String = "an adult couple embracing under the rain on a neon-lit street",
        italianText: String = "una coppia adulta si abbraccia sotto la pioggia in una strada illuminata al neon",
        variantCount: Int = 4,
        seed: Long? = 42L,
        targetModel: TargetModel = TargetModel.StableDiffusion,
        customNegativeTerms: List<String> = emptyList(),
    ) = PromptRequest(
        draft = PromptDraft(italianText = italianText, englishText = englishText),
        output = OutputConfig(targetModel = targetModel, variantCount = variantCount, seed = seed),
        negativePrompt = NegativePromptConfig(customTerms = customNegativeTerms),
    )

    @Test
    fun `genera esattamente variantCount varianti`() {
        val result = engine.generate(requestFor(variantCount = 3))

        assertEquals(3, result.size)
    }

    @Test
    fun `le varianti sono tutte diverse tra loro`() {
        val result = engine.generate(requestFor(variantCount = 4))

        val distinctPrompts = result.map { it.positivePrompt }.toSet()
        assertEquals(4, distinctPrompts.size)
    }

    @Test
    fun `il soggetto e l'azione non cambiano tra le varianti`() {
        val result = engine.generate(requestFor(variantCount = 4))

        result.forEach { generated ->
            assertTrue(generated.positivePrompt.startsWith("an adult couple embracing under the rain on a neon-lit street"))
        }
    }

    @Test
    fun `stesso seed e stesso testo producono lo stesso output`() {
        val first = engine.generate(requestFor(seed = 7L))
        val second = engine.generate(requestFor(seed = 7L))

        assertEquals(first.map { it.positivePrompt }, second.map { it.positivePrompt })
        assertEquals(first.map { it.seedUsed }, second.map { it.seedUsed })
    }

    @Test
    fun `seed diverso produce output diverso`() {
        val first = engine.generate(requestFor(seed = 7L))
        val second = engine.generate(requestFor(seed = 99L))

        assertFalse(first.map { it.positivePrompt } == second.map { it.positivePrompt })
    }

    @Test
    fun `il prompt negativo include i termini di base e quelli custom`() {
        val result = engine.generate(requestFor(customNegativeTerms = listOf("watermark")))

        result.forEach { generated ->
            assertTrue(generated.negativePrompt.contains("bad anatomy"))
            assertTrue(generated.negativePrompt.contains("watermark"))
        }
    }

    @Test
    fun `il prompt negativo non contiene mai termini legati alla modalita adulti`() {
        val result = engine.generate(requestFor())

        result.forEach { generated ->
            val lower = generated.negativePrompt.lowercase()
            assertFalse(lower.contains("nsfw"))
            assertFalse(lower.contains("nudity"))
            assertFalse(lower.contains("explicit"))
        }
    }

    @Test
    fun `la posa rilevata dal testo ha priorita sulla posa selezionata in UI`() {
        val request = requestFor().copy(selectedPose = "standing formal pose")

        val result = engine.generate(request)

        result.forEach { generated ->
            assertTrue(generated.positivePrompt.contains("embracing pose"))
            assertFalse(generated.positivePrompt.contains("standing formal pose"))
        }
    }

    @Test
    fun `midjourney aggiunge la sintassi aspect ratio e seed`() {
        val result = engine.generate(requestFor(targetModel = TargetModel.Midjourney, variantCount = 1, seed = 7L))

        assertTrue(result.single().positivePrompt.contains("--ar 1:1"))
        assertTrue(result.single().positivePrompt.contains("--seed 7"))
    }
}
