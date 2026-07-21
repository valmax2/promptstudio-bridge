package com.promptforge.pro.coredatabase

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.promptforge.pro.coremodel.PromptForgeJson
import com.promptforge.pro.coremodel.PromptPreset
import com.promptforge.pro.coremodel.PromptRequest
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

/**
 * Riga Room per [PromptPreset] (§2 Preset). L'intera [PromptRequest] è
 * salvata come singola colonna JSON: un preset è per definizione uno snapshot
 * completo della configurazione, non ha senso normalizzarlo in colonne.
 */
@Entity(tableName = "prompt_presets")
data class PromptPresetEntity(
    @PrimaryKey val id: String,
    val name: String,
    val requestJson: String,
    val isBuiltIn: Boolean,
    val createdAtEpochMillis: Long,
    val schemaVersion: Int,
)

fun PromptPreset.toEntity(): PromptPresetEntity = PromptPresetEntity(
    id = id,
    name = name,
    requestJson = PromptForgeJson.instance.encodeToString(request),
    isBuiltIn = isBuiltIn,
    createdAtEpochMillis = createdAtEpochMillis,
    schemaVersion = schemaVersion,
)

fun PromptPresetEntity.toDomain(): PromptPreset = PromptPreset(
    id = id,
    name = name,
    request = PromptForgeJson.instance.decodeFromString<PromptRequest>(requestJson),
    isBuiltIn = isBuiltIn,
    createdAtEpochMillis = createdAtEpochMillis,
    schemaVersion = schemaVersion,
)
