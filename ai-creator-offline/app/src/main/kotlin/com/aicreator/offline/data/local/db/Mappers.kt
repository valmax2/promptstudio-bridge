package com.aicreator.offline.data.local.db

import com.aicreator.offline.data.local.db.entities.CharacterEntity
import com.aicreator.offline.data.local.db.entities.HistoryEntity
import com.aicreator.offline.data.local.db.entities.LoraEntity
import com.aicreator.offline.data.local.db.entities.ModelEntity
import com.aicreator.offline.data.local.db.entities.PresetEntity
import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.domain.model.CharacterReference
import com.aicreator.offline.domain.model.GenerationParams
import com.aicreator.offline.domain.model.GenerationStatus
import com.aicreator.offline.domain.model.HistoryEntry
import com.aicreator.offline.domain.model.LoraAdapter
import com.aicreator.offline.domain.model.Preset
import com.aicreator.offline.domain.model.SchedulerType

fun ModelEntity.toDomain() = AiModel(
    id = id,
    displayName = displayName,
    engine = engine,
    sourceFolderUri = sourceFolderUri,
    localPath = localPath,
    sizeBytes = sizeBytes,
    minRamMb = minRamMb,
    recommendedResolution = recommendedResolution,
    maxSteps = maxSteps,
    checksumSha256 = checksumSha256,
    license = license,
    supportsLora = supportsLora,
    isActive = isActive,
    importedAt = importedAt,
)

fun AiModel.toEntity() = ModelEntity(
    id = id,
    displayName = displayName,
    engine = engine,
    sourceFolderUri = sourceFolderUri,
    localPath = localPath,
    sizeBytes = sizeBytes,
    minRamMb = minRamMb,
    recommendedResolution = recommendedResolution,
    maxSteps = maxSteps,
    checksumSha256 = checksumSha256,
    license = license,
    supportsLora = supportsLora,
    isActive = isActive,
    importedAt = importedAt,
)

fun LoraEntity.toDomain() = LoraAdapter(
    id = id,
    displayName = displayName,
    baseModelId = baseModelId,
    localPath = localPath,
    sizeBytes = sizeBytes,
    checksumSha256 = checksumSha256,
    isEnabled = isEnabled,
    importedAt = importedAt,
)

fun LoraAdapter.toEntity() = LoraEntity(
    id = id,
    displayName = displayName,
    baseModelId = baseModelId,
    localPath = localPath,
    sizeBytes = sizeBytes,
    checksumSha256 = checksumSha256,
    isEnabled = isEnabled,
    importedAt = importedAt,
)

fun CharacterEntity.toDomain() = CharacterReference(
    id = id,
    name = name,
    imagePath = imagePath,
    mode = runCatching { CharacterMode.valueOf(mode) }.getOrDefault(CharacterMode.PORTRAIT),
    createdAt = createdAt,
)

fun CharacterReference.toEntity() = CharacterEntity(
    id = id,
    name = name,
    imagePath = imagePath,
    mode = mode.name,
    createdAt = createdAt,
)

private fun schedulerOf(name: String) = runCatching { SchedulerType.valueOf(name) }.getOrDefault(SchedulerType.EULER_ANCESTRAL)
private fun characterModeOf(name: String?) = name?.let { runCatching { CharacterMode.valueOf(it) }.getOrNull() }
private fun loraIdsOf(csv: String) = csv.split(',').map { it.trim() }.filter { it.isNotEmpty() }
private fun loraIdsToCsv(ids: List<String>) = ids.joinToString(",")

fun PresetEntity.toDomain() = Preset(
    id = id,
    name = name,
    params = GenerationParams(
        positivePrompt = positivePrompt,
        negativePrompt = negativePrompt,
        translatePromptToEnglish = translatePromptToEnglish,
        seed = seed,
        steps = steps,
        cfgScale = cfgScale,
        scheduler = schedulerOf(scheduler),
        width = width,
        height = height,
        modelId = modelId,
        loraIds = loraIdsOf(loraIdsCsv),
        referenceImageUri = referenceImageUri,
        referenceStrength = referenceStrength,
        faceConsistencyStrength = faceConsistencyStrength,
        characterMode = characterModeOf(characterMode),
        upscale = upscale,
    ),
    createdAt = createdAt,
)

fun Preset.toEntity() = PresetEntity(
    id = id,
    name = name,
    positivePrompt = params.positivePrompt,
    negativePrompt = params.negativePrompt,
    translatePromptToEnglish = params.translatePromptToEnglish,
    seed = params.seed,
    steps = params.steps,
    cfgScale = params.cfgScale,
    scheduler = params.scheduler.name,
    width = params.width,
    height = params.height,
    modelId = params.modelId,
    loraIdsCsv = loraIdsToCsv(params.loraIds),
    referenceImageUri = params.referenceImageUri,
    referenceStrength = params.referenceStrength,
    faceConsistencyStrength = params.faceConsistencyStrength,
    characterMode = params.characterMode?.name,
    upscale = params.upscale,
    createdAt = createdAt,
)

fun HistoryEntity.toDomain() = HistoryEntry(
    id = id,
    params = GenerationParams(
        positivePrompt = positivePrompt,
        negativePrompt = negativePrompt,
        translatePromptToEnglish = translatePromptToEnglish,
        seed = seed,
        steps = steps,
        cfgScale = cfgScale,
        scheduler = schedulerOf(scheduler),
        width = width,
        height = height,
        modelId = modelId,
        loraIds = loraIdsOf(loraIdsCsv),
        referenceImageUri = referenceImageUri,
        referenceStrength = referenceStrength,
        faceConsistencyStrength = faceConsistencyStrength,
        characterMode = characterModeOf(characterMode),
        upscale = upscale,
    ),
    resultImagePath = resultImagePath,
    status = runCatching { GenerationStatus.valueOf(status) }.getOrDefault(GenerationStatus.ERROR),
    errorMessage = errorMessage,
    durationMs = durationMs,
    createdAt = createdAt,
    isFavorite = isFavorite,
)
