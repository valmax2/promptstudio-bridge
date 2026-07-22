package com.promptforge.pro.coremodel

import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Verifica che i modelli persistiti sopravvivano a un giro completo di
 * serializzazione/deserializzazione JSON: da questo dipendono sia il salvataggio
 * su Room (core-database) sia l'export/import manuale (§2).
 */
class PromptForgeJsonRoundTripTest {
    private val json = PromptForgeJson.instance

    @Test
    fun `PromptRequest sopravvive al round-trip`() {
        val request = PromptRequest(
            draft = PromptDraft(italianText = "una donna cammina in città", englishText = "a woman walking in the city"),
            characterReferences = listOf(
                CharacterReferenceConfig(characterName = "Alice", imageUri = "content://x/1"),
            ),
            visualStyle = VisualStyle.Cinematic,
            mood = "malinconico",
            directorMap = DirectorMapState.Default.copy(zoomPercent = 150),
            output = OutputConfig(targetModel = TargetModel.Midjourney, seed = 123L, variantCount = 3),
        )

        val encoded = json.encodeToString(request)
        val decoded = json.decodeFromString<PromptRequest>(encoded)

        assertEquals(request, decoded)
    }

    @Test
    fun `lista di GeneratedPrompt sopravvive al round-trip`() {
        val prompts = listOf(
            GeneratedPrompt(
                id = "p1", requestId = "req1", variantIndex = 0,
                positivePrompt = "a woman walking, cinematic", negativePrompt = "blurry",
                seedUsed = 1L, createdAtEpochMillis = 1_700_000_000_000L,
            ),
            GeneratedPrompt(
                id = "p2", requestId = "req1", variantIndex = 1,
                positivePrompt = "a woman walking, dramatic light", negativePrompt = "blurry",
                seedUsed = 2L, createdAtEpochMillis = 1_700_000_000_001L,
            ),
        )

        val encoded = json.encodeToString(ListSerializer(GeneratedPrompt.serializer()), prompts)
        val decoded = json.decodeFromString(ListSerializer(GeneratedPrompt.serializer()), encoded)

        assertEquals(prompts, decoded)
    }

    @Test
    fun `LibraryItem sopravvive al round-trip`() {
        val item = LibraryItem(
            id = "item1",
            draft = PromptDraft(italianText = "un gatto sul davanzale", englishText = "a cat on the windowsill"),
            generatedPrompts = listOf(
                GeneratedPrompt(
                    id = "p1", requestId = "req1", variantIndex = 0,
                    positivePrompt = "a cat on the windowsill, soft light", negativePrompt = "blurry",
                    seedUsed = 5L, createdAtEpochMillis = 1_700_000_000_000L,
                ),
            ),
            tags = listOf("animali", "preferiti"),
            favorite = true,
            createdAtEpochMillis = 1_700_000_000_000L,
            updatedAtEpochMillis = 1_700_000_001_000L,
        )

        val encoded = json.encodeToString(item)
        val decoded = json.decodeFromString<LibraryItem>(encoded)

        assertEquals(item, decoded)
    }

    @Test
    fun `PromptPreset sopravvive al round-trip`() {
        val preset = PromptPreset(
            id = "preset1",
            name = "Ritratto cinematografico",
            request = PromptRequest(draft = PromptDraft(englishText = "portrait")),
            createdAtEpochMillis = 1_700_000_000_000L,
        )

        val encoded = json.encodeToString(preset)
        val decoded = json.decodeFromString<PromptPreset>(encoded)

        assertEquals(preset, decoded)
    }

    @Test
    fun `CharacterProfile con Character Pack sopravvive al round-trip`() {
        val profile = CharacterProfile(
            id = "char1",
            name = "Elena",
            referenceImageUris = listOf("content://x/1", "content://x/2"),
            faceDescription = "viso ovale, occhi verdi",
            characterPack = listOf(
                CharacterPackImage(view = CharacterPackView.FrontNeutral, imageUri = "content://out/1", generatedAtEpochMillis = 1L),
                CharacterPackImage(view = CharacterPackView.LeftProfile),
            ),
            createdAtEpochMillis = 1_700_000_000_000L,
            updatedAtEpochMillis = 1_700_000_001_000L,
        )

        val encoded = json.encodeToString(profile)
        val decoded = json.decodeFromString<CharacterProfile>(encoded)

        assertEquals(profile, decoded)
    }
}
