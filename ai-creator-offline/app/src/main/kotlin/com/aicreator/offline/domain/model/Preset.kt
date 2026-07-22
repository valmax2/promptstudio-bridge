package com.aicreator.offline.domain.model

data class Preset(
    val id: String,
    val name: String,
    val params: GenerationParams,
    val createdAt: Long,
)
