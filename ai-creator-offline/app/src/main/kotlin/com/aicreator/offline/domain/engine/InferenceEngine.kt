package com.aicreator.offline.domain.engine

import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.model.GenerationProgress
import com.aicreator.offline.domain.model.GenerationRequest
import com.aicreator.offline.domain.model.GenerationResult
import com.aicreator.offline.domain.model.LoraAdapter
import kotlinx.coroutines.flow.Flow

/** Esito della preparazione di un motore per un dato modello, prima di generare. */
sealed interface EnginePrepareResult {
    data class Ready(val capabilities: EngineCapabilities) : EnginePrepareResult
    data class Unavailable(val reason: String, val technicalDetail: String? = null) : EnginePrepareResult
}

sealed interface GenerationUpdate {
    data class Progress(val progress: GenerationProgress) : GenerationUpdate
    data class Finished(val result: GenerationResult) : GenerationUpdate
}

/**
 * Contratto unico verso qualunque motore di inferenza on-device. Nessun livello
 * superiore (UseCase, ViewModel, UI) conosce MediaPipe, ONNX Runtime o altro:
 * per aggiungere un motore basta implementare questa interfaccia e registrarla
 * in [InferenceEngineFactory]. Vedi docs/FEASIBILITY.md per il confronto dei motori.
 */
interface InferenceEngine {
    /** Identificatore stabile, corrisponde al campo "engine" di manifest.json (es. "mediapipe-image-generator"). */
    val id: String
    val displayName: String

    /**
     * Carica modello + LoRA selezionati e restituisce le capacità effettive.
     * Deve essere chiamato prima di [generate]. Non lancia eccezioni: un
     * fallimento (modello mancante, formato incompatibile, RAM insufficiente)
     * è comunicato tramite [EnginePrepareResult.Unavailable] con un messaggio
     * in italiano comprensibile.
     */
    suspend fun prepare(model: AiModel, loras: List<LoraAdapter>): EnginePrepareResult

    /**
     * Avvia la generazione e riporta [GenerationUpdate.Progress] passo-passo,
     * terminando sempre con esattamente un [GenerationUpdate.Finished].
     * Deve rispettare la cancellazione cooperativa della coroutine
     * (chiamare [cancel] o cancellare il collector interrompe la generazione).
     */
    fun generate(request: GenerationRequest): Flow<GenerationUpdate>

    /** Richiede l'interruzione della generazione in corso per [requestId], se presente. */
    fun cancel(requestId: String)

    /** Libera risorse native (buffer GPU, handle del modello). Chiamato quando si cambia modello o si chiude l'app. */
    suspend fun release()
}
