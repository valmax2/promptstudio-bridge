package com.aicreator.offline.domain.engine.placeholder

import com.aicreator.offline.domain.engine.EnginePrepareResult
import com.aicreator.offline.domain.engine.GenerationUpdate
import com.aicreator.offline.domain.engine.InferenceEngine
import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.model.GenerationRequest
import com.aicreator.offline.domain.model.GenerationResult
import com.aicreator.offline.domain.model.LoraAdapter
import kotlinx.coroutines.flow.flowOf

/**
 * Implementazione onesta per un `engine` dichiarato in manifest.json ma non
 * ancora collegato a un vero motore (es. "onnx-runtime", vedi docs/TODO.md).
 * Non genera nulla e non finge di farlo: [prepare] restituisce sempre
 * [EnginePrepareResult.Unavailable] con la spiegazione esatta.
 */
class UnavailableInferenceEngine(private val requestedEngineId: String) : InferenceEngine {

    override val id: String = requestedEngineId
    override val displayName: String = "Motore non disponibile ($requestedEngineId)"

    override suspend fun prepare(model: AiModel, loras: List<LoraAdapter>): EnginePrepareResult =
        EnginePrepareResult.Unavailable(
            reason = "Il motore \"$requestedEngineId\" richiesto dal modello \"${model.displayName}\" " +
                "non è ancora implementato in questa versione dell'app.",
            technicalDetail = "InferenceEngineFactory non ha una implementazione registrata per engine=$requestedEngineId",
        )

    override fun generate(request: GenerationRequest) = flowOf(
        GenerationUpdate.Finished(
            GenerationResult.Error(
                userMessage = "Impossibile generare: il motore per questo modello non è disponibile.",
                technicalDetail = "engine=$requestedEngineId non implementato",
            ),
        ),
    )

    override fun cancel(requestId: String) = Unit

    override suspend fun release() = Unit
}
