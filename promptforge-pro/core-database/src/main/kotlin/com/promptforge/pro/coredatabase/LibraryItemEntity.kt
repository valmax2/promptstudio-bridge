package com.promptforge.pro.coredatabase

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coremodel.LibraryItem
import com.promptforge.pro.coremodel.PromptDraft
import com.promptforge.pro.coremodel.PromptForgeJson
import com.promptforge.pro.coremodel.SubjectMode
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer

/**
 * Riga Room per [LibraryItem] (§2 Libreria: "persistenza Room"). I campi
 * complessi (prompt generati, tag) sono colonne TEXT con JSON serializzato
 * tramite [PromptForgeJson] — più semplice di tabelle relazionali separate e
 * sufficiente per il volume di dati di una libreria personale.
 */
@Entity(tableName = "library_items")
data class LibraryItemEntity(
    @PrimaryKey val id: String,
    val draftItalianText: String,
    val draftEnglishText: String,
    val draftEnglishManuallyEdited: Boolean,
    val draftSubjectMode: String,
    val generatedPromptsJson: String,
    val tagsJson: String,
    val favorite: Boolean,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
    val schemaVersion: Int,
)

fun LibraryItem.toEntity(): LibraryItemEntity = LibraryItemEntity(
    id = id,
    draftItalianText = draft.italianText,
    draftEnglishText = draft.englishText,
    draftEnglishManuallyEdited = draft.englishManuallyEdited,
    draftSubjectMode = draft.subjectMode.name,
    generatedPromptsJson = PromptForgeJson.instance.encodeToString(
        ListSerializer(GeneratedPrompt.serializer()),
        generatedPrompts,
    ),
    tagsJson = PromptForgeJson.instance.encodeToString(ListSerializer(String.serializer()), tags),
    favorite = favorite,
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
    schemaVersion = schemaVersion,
)

fun LibraryItemEntity.toDomain(): LibraryItem = LibraryItem(
    id = id,
    draft = PromptDraft(
        italianText = draftItalianText,
        englishText = draftEnglishText,
        englishManuallyEdited = draftEnglishManuallyEdited,
        subjectMode = SubjectMode.valueOf(draftSubjectMode),
    ),
    generatedPrompts = PromptForgeJson.instance.decodeFromString(
        ListSerializer(GeneratedPrompt.serializer()),
        generatedPromptsJson,
    ),
    tags = PromptForgeJson.instance.decodeFromString(ListSerializer(String.serializer()), tagsJson),
    favorite = favorite,
    createdAtEpochMillis = createdAtEpochMillis,
    updatedAtEpochMillis = updatedAtEpochMillis,
    schemaVersion = schemaVersion,
)
