package com.promptforge.pro.coredatabase

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.promptforge.pro.coremodel.CharacterConsistencyMethod
import com.promptforge.pro.coremodel.CharacterPackImage
import com.promptforge.pro.coremodel.CharacterProfile
import com.promptforge.pro.coremodel.PromptForgeJson
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer

/** Riga Room per [CharacterProfile] (v7 §2/§8: scheda personaggio persistente). */
@Entity(tableName = "character_profiles")
data class CharacterProfileEntity(
    @PrimaryKey val id: String,
    val name: String,
    val referenceImageUrisJson: String,
    val faceDescription: String,
    val bodyDescription: String,
    val hairDescription: String,
    val skinDescription: String,
    val outfitDescription: String,
    val identifyingDetails: String,
    val consistencyMethod: String,
    val similarityStrength: Float,
    val faceStructureStrength: Float,
    val styleFreedom: Float,
    val characterPackJson: String,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
    val schemaVersion: Int,
)

fun CharacterProfile.toEntity(): CharacterProfileEntity = CharacterProfileEntity(
    id = id,
    name = name,
    referenceImageUrisJson = PromptForgeJson.instance.encodeToString(ListSerializer(String.serializer()), referenceImageUris),
    faceDescription = faceDescription,
    bodyDescription = bodyDescription,
    hairDescription = hairDescription,
    skinDescription = skinDescription,
    outfitDescription = outfitDescription,
    identifyingDetails = identifyingDetails,
    consistencyMethod = consistencyMethod.name,
    similarityStrength = similarityStrength,
    faceStructureStrength = faceStructureStrength,
    styleFreedom = styleFreedom,
    characterPackJson = PromptForgeJson.instance.encodeToString(ListSerializer(CharacterPackImage.serializer()), characterPack),
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
    schemaVersion = schemaVersion,
)

fun CharacterProfileEntity.toDomain(): CharacterProfile = CharacterProfile(
    id = id,
    name = name,
    referenceImageUris = PromptForgeJson.instance.decodeFromString(ListSerializer(String.serializer()), referenceImageUrisJson),
    faceDescription = faceDescription,
    bodyDescription = bodyDescription,
    hairDescription = hairDescription,
    skinDescription = skinDescription,
    outfitDescription = outfitDescription,
    identifyingDetails = identifyingDetails,
    consistencyMethod = CharacterConsistencyMethod.valueOf(consistencyMethod),
    similarityStrength = similarityStrength,
    faceStructureStrength = faceStructureStrength,
    styleFreedom = styleFreedom,
    characterPack = PromptForgeJson.instance.decodeFromString(ListSerializer(CharacterPackImage.serializer()), characterPackJson),
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
    schemaVersion = schemaVersion,
)
