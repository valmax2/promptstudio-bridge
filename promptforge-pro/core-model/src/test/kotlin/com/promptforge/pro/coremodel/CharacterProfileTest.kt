package com.promptforge.pro.coremodel

import org.junit.Assert.assertEquals
import org.junit.Test

class CharacterProfileTest {

    @Test
    fun `toReferenceConfig usa la prima foto di riferimento`() {
        val profile = CharacterProfile(
            id = "char1",
            name = "Marco",
            referenceImageUris = listOf("content://prima", "content://seconda"),
            consistencyMethod = CharacterConsistencyMethod.InstantId,
            similarityStrength = 0.9f,
            createdAtEpochMillis = 0L,
            updatedAtEpochMillis = 0L,
        )

        val config = profile.toReferenceConfig()

        assertEquals("Marco", config.characterName)
        assertEquals("content://prima", config.imageUri)
        assertEquals(CharacterConsistencyMethod.InstantId, config.method)
        assertEquals(0.9f, config.similarityStrength, 0.001f)
    }

    @Test
    fun `toReferenceConfig senza foto ha imageUri null`() {
        val profile = CharacterProfile(
            id = "char1",
            name = "Senza foto",
            createdAtEpochMillis = 0L,
            updatedAtEpochMillis = 0L,
        )

        assertEquals(null, profile.toReferenceConfig().imageUri)
    }
}
