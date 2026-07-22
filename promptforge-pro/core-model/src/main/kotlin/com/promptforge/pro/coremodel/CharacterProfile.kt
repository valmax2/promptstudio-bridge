package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

/**
 * Le 6 viste standard del Character Pack (v7 §2/§8): stessa identità,
 * angolazioni e espressione diverse. I frammenti di prompt sono descrizioni
 * puramente tecniche di inquadratura/espressione (angolo di ripresa, sorriso
 * neutro) — non contenuto sensibile, per questo sono valori fissi qui invece
 * che testo libero dell'utente.
 */
enum class CharacterPackView(val label: String, val promptFragment: String) {
    FrontNeutral(
        label = "Frontale neutro",
        promptFragment = "front-facing neutral identity portrait, eye-level camera, relaxed neutral " +
            "expression, exact facial identity, same hairstyle and age",
    ),
    ThreeQuarterLeft(
        label = "Tre quarti sinistra",
        promptFragment = "three-quarter left view identity portrait, head turned 35 degrees, exact " +
            "facial identity, same hairstyle and age",
    ),
    LeftProfile(
        label = "Profilo sinistro",
        promptFragment = "strict left profile identity portrait, 90 degree head turn, exact facial " +
            "identity, same hairstyle and age",
    ),
    ThreeQuarterRight(
        label = "Tre quarti destra",
        promptFragment = "three-quarter right view identity portrait, head turned 35 degrees, exact " +
            "facial identity, same hairstyle and age",
    ),
    RightProfile(
        label = "Profilo destro",
        promptFragment = "strict right profile identity portrait, 90 degree head turn, exact facial " +
            "identity, same hairstyle and age",
    ),
    SmileExpression(
        label = "Sorriso",
        promptFragment = "front-facing identity portrait with a natural warm smile, exact facial " +
            "identity, same hairstyle and age",
    ),
}

@Serializable
data class CharacterPackImage(
    val view: CharacterPackView,
    val imageUri: String? = null,
    val generatedAtEpochMillis: Long? = null,
)

/**
 * Scheda personaggio persistente (§8 del master prompt v7): a differenza di
 * [CharacterReferenceConfig] — che è lo snapshot usato in una singola
 * [PromptRequest] — questa è la voce di libreria riusabile tra più
 * generazioni, con tutti i campi descrittivi richiesti esplicitamente.
 */
@Serializable
data class CharacterProfile(
    val id: String,
    val name: String,
    val referenceImageUris: List<String> = emptyList(),
    val faceDescription: String = "",
    val bodyDescription: String = "",
    val hairDescription: String = "",
    val skinDescription: String = "",
    val outfitDescription: String = "",
    val identifyingDetails: String = "",
    val consistencyMethod: CharacterConsistencyMethod = CharacterConsistencyMethod.ReferenceOnly,
    val similarityStrength: Float = 0.7f,
    val faceStructureStrength: Float = 0.7f,
    val styleFreedom: Float = 0.3f,
    val characterPack: List<CharacterPackImage> = emptyList(),
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
    val schemaVersion: Int = 1,
) {
    /** Trasforma la scheda in uno snapshot pronto per una generazione (§8 → PromptRequest). */
    fun toReferenceConfig(): CharacterReferenceConfig = CharacterReferenceConfig(
        characterName = name,
        imageUri = referenceImageUris.firstOrNull(),
        method = consistencyMethod,
        similarityStrength = similarityStrength,
        faceStructureStrength = faceStructureStrength,
        styleFreedom = styleFreedom,
    )
}
