package com.aicreator.offline.domain.model

import java.util.UUID

enum class GenerationStatus {
    RUNNING,
    SUCCESS,
    ERROR,
    CANCELLED,
}

data class GenerationRequest(
    val id: String = UUID.randomUUID().toString(),
    val params: GenerationParams,
    val createdAt: Long = System.currentTimeMillis(),
)
