package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

@Serializable
data class PromptPreset(
    val id: String,
    val name: String,
    val request: PromptRequest,
    val isBuiltIn: Boolean = false,
    val createdAtEpochMillis: Long,
    val schemaVersion: Int = 1,
)

@Serializable
data class LibraryItem(
    val id: String,
    val draft: PromptDraft,
    val generatedPrompts: List<GeneratedPrompt>,
    val tags: List<String> = emptyList(),
    val favorite: Boolean = false,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
    val schemaVersion: Int = 1,
)

/**
 * Metadati del workflow ComfyUI esportato o inviato via LAN (§9). Il workflow
 * JSON stesso è tenuto come stringa opaca: i custom node installati variano da
 * installazione a installazione, quindi non modelliamo la struttura del grafo
 * qui — è responsabilità del client ComfyUI comporla in modo configurabile.
 */
@Serializable
data class ComfyWorkflowMetadata(
    val workflowJson: String,
    val checkpointName: String? = null,
    val referenceImageFileName: String? = null,
    val notes: String = "",
    val schemaVersion: Int = 1,
)
