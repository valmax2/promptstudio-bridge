package com.aicreator.offline.domain.engine

import com.aicreator.offline.domain.engine.mediapipe.MediaPipeImageGenerationEngine
import com.aicreator.offline.domain.engine.placeholder.UnavailableInferenceEngine

/**
 * Punto unico di sostituzione/estensione del motore di inferenza. Aggiungere
 * un nuovo motore (es. ONNX Runtime Mobile, vedi docs/TODO.md punto 3)
 * significa: implementare [InferenceEngine], istanziarlo qui e aggiungere un
 * ramo alla `when`. Nessun'altra parte dell'app cambia.
 */
class InferenceEngineFactory(
    private val mediaPipeEngine: MediaPipeImageGenerationEngine,
) {
    fun engineFor(engineId: String): InferenceEngine = when (engineId) {
        MediaPipeImageGenerationEngine.ENGINE_ID -> mediaPipeEngine
        // "onnx-runtime" -> onnxRuntimeEngine  // non ancora implementato, vedi docs/TODO.md
        else -> UnavailableInferenceEngine(engineId)
    }
}
