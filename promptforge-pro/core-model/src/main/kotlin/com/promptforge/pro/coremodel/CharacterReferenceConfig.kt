package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

enum class CharacterConsistencyMethod { InstantId, IpAdapterFaceId, PuLid, ReferenceOnly }

/**
 * Riferimento a un'immagine importata per la consistenza personaggio (§8).
 * `imageUri` è l'URI persistente (Storage Access Framework) o il path nella
 * copia privata dell'app — mai un upload cloud.
 */
@Serializable
data class CharacterReferenceConfig(
    val characterName: String = "",
    val imageUri: String? = null,
    val method: CharacterConsistencyMethod = CharacterConsistencyMethod.ReferenceOnly,
    val similarityStrength: Float = 0.7f,
    val faceStructureStrength: Float = 0.7f,
    val styleFreedom: Float = 0.3f,
    val preserveFace: Boolean = true,
    val preserveHair: Boolean = true,
    val preserveOutfit: Boolean = false,
    val preserveBuild: Boolean = true,
    val preserveSkinTone: Boolean = true,
    val schemaVersion: Int = 1,
)
