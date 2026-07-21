package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

@Serializable
data class LightingConfig(
    val style: String = "soft natural light",
    val timeOfDay: String = "day",
    val schemaVersion: Int = 1,
)

@Serializable
data class EnvironmentConfig(
    val setting: String = "",
    val weather: String = "",
    val colorGrading: String = "",
    val filmStock: String = "",
    val schemaVersion: Int = 1,
)

enum class SubjectMode { Single, Multiple }

enum class VisualStyle { Photorealistic, Cinematic, Illustration, Anime, Painterly, Concept }

enum class TargetModel { StableDiffusion, ComfyUI, Midjourney, DallE, LeonardoAI, Flux }
