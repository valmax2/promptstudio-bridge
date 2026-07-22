package com.aicreator.offline.domain.usecase

import com.aicreator.offline.domain.conditioning.CharacterConditioningModule
import com.aicreator.offline.domain.conditioning.ConditioningPlan
import com.aicreator.offline.domain.engine.EnginePrepareResult
import com.aicreator.offline.domain.engine.GenerationUpdate
import com.aicreator.offline.domain.engine.InferenceEngine
import com.aicreator.offline.domain.engine.InferenceEngineFactory
import com.aicreator.offline.domain.hardware.DeviceCapabilityAnalyzer
import com.aicreator.offline.domain.model.CharacterMode
import com.aicreator.offline.domain.model.GenerationRequest
import com.aicreator.offline.domain.model.GenerationResult
import com.aicreator.offline.domain.repository.HistoryRepository
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.repository.ModelRepository
import com.aicreator.offline.domain.translation.OfflinePromptTranslator
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Orchestrazione completa di una generazione: risolve modello/LoRA, controlla
 * la memoria disponibile, valida il condizionamento personaggio richiesto,
 * traduce il prompt se richiesto, delega al motore e registra sempre l'esito
 * in cronologia (successo, errore o annullamento).
 */
class GenerateImageUseCase(
    private val modelRepository: ModelRepository,
    private val loraRepository: LoraRepository,
    private val historyRepository: HistoryRepository,
    private val engineFactory: InferenceEngineFactory,
    private val hardwareAnalyzer: DeviceCapabilityAnalyzer,
    private val translator: OfflinePromptTranslator,
    private val faceConditioning: CharacterConditioningModule,
    private val fullBodyConditioning: CharacterConditioningModule,
) {
    @Volatile
    private var activeEngine: InferenceEngine? = null

    fun execute(request: GenerationRequest): Flow<GenerationUpdate> = flow {
        val model = modelRepository.getModel(request.params.modelId)
        if (model == null) {
            emit(GenerationUpdate.Finished(GenerationResult.Error("Modello non trovato: importalo o selezionane un altro.")))
            return@flow
        }
        if (!model.isActive) {
            emit(GenerationUpdate.Finished(GenerationResult.Error("Il modello \"${model.displayName}\" è disattivato. Attivalo dalla schermata Modelli.")))
            return@flow
        }

        val availableRam = hardwareAnalyzer.availableRamMb()
        if (availableRam < model.minRamMb) {
            emit(
                GenerationUpdate.Finished(
                    GenerationResult.Error(
                        "Memoria disponibile insufficiente (~$availableRam MB liberi, ne servono almeno ${model.minRamMb} MB). " +
                            "Chiudi altre app, riduci la risoluzione o passa al profilo Base.",
                    ),
                ),
            )
            return@flow
        }
        if (hardwareAnalyzer.isMemoryCriticallyLow()) {
            emit(GenerationUpdate.Finished(GenerationResult.Error("Il sistema segnala memoria critica: generazione annullata per evitare un crash.")))
            return@flow
        }

        val loras = loraRepository.getLoras(request.params.loraIds).filter { it.isEnabled }
        val engine = engineFactory.engineFor(model.engine)
        activeEngine = engine

        val capabilities = when (val prepared = engine.prepare(model, loras)) {
            is EnginePrepareResult.Unavailable -> {
                emit(GenerationUpdate.Finished(GenerationResult.Error(prepared.reason, prepared.technicalDetail)))
                return@flow
            }
            is EnginePrepareResult.Ready -> prepared.capabilities
        }

        val characterMode = request.params.characterMode
        if (characterMode != null) {
            val module = if (characterMode == CharacterMode.PORTRAIT) faceConditioning else fullBodyConditioning
            val plan = module.plan(request.params.referenceImageUri, request.params.referenceStrength, request.params.faceConsistencyStrength)
            if (plan is ConditioningPlan.Rejected) {
                emit(GenerationUpdate.Finished(GenerationResult.Error(plan.reason)))
                return@flow
            }
            val supported = if (characterMode == CharacterMode.PORTRAIT) {
                capabilities.supportsFaceConditioning
            } else {
                capabilities.supportsFullBodyConditioning
            }
            if (!supported) {
                val modeName = if (characterMode == CharacterMode.PORTRAIT) "Volto" else "Full Body"
                emit(
                    GenerationUpdate.Finished(
                        GenerationResult.Error(
                            "La coerenza del personaggio (\"$modeName\") non è ancora collegata al motore attuale in questa versione dell'app. " +
                                "Vedi docs/TODO.md. Puoi comunque generare senza foto di riferimento.",
                        ),
                    ),
                )
                return@flow
            }
        }

        val translatedParams = if (request.params.translatePromptToEnglish) {
            request.params.copy(
                positivePrompt = translator.translate(request.params.positivePrompt),
                negativePrompt = translator.translate(request.params.negativePrompt),
            )
        } else {
            request.params
        }
        val finalRequest = request.copy(params = translatedParams)
        val startedAt = System.currentTimeMillis()

        engine.generate(finalRequest).collect { update ->
            emit(update)
            if (update is GenerationUpdate.Finished) {
                val durationMs = System.currentTimeMillis() - startedAt
                when (val result = update.result) {
                    is GenerationResult.Success -> historyRepository.recordSuccess(finalRequest.id, result.imagePath, result.metadata)
                    is GenerationResult.Error -> historyRepository.recordError(finalRequest.id, translatedParams, result.userMessage, durationMs)
                    GenerationResult.Cancelled -> historyRepository.recordCancelled(finalRequest.id, translatedParams, durationMs)
                }
            }
        }
    }

    fun stop(requestId: String) {
        activeEngine?.cancel(requestId)
    }
}
