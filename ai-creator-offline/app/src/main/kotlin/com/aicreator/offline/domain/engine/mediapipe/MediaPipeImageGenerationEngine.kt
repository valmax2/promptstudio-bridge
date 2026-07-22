package com.aicreator.offline.domain.engine.mediapipe

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.domain.engine.EngineCapabilities
import com.aicreator.offline.domain.engine.EnginePrepareResult
import com.aicreator.offline.domain.engine.GenerationUpdate
import com.aicreator.offline.domain.engine.InferenceEngine
import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.model.GenerationMetadata
import com.aicreator.offline.domain.model.GenerationProgress
import com.aicreator.offline.domain.model.GenerationRequest
import com.aicreator.offline.domain.model.GenerationResult
import com.aicreator.offline.domain.model.LoraAdapter
import com.aicreator.offline.domain.model.SchedulerType
import com.google.mediapipe.tasks.vision.imagegenerator.ImageGenerator
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ConcurrentHashMap

/**
 * Motore primario, basato su MediaPipe Tasks — Image Generation
 * (`com.google.mediapipe:tasks-vision-image-generator`, vedi
 * gradle/libs.versions.toml). Scelto perché è l'unica API Android *ufficiale*
 * pensata esplicitamente per diffusion testo→immagine on-device, con supporto
 * nativo a pesi LoRA (vedi docs/FEASIBILITY.md per il confronto con le
 * alternative).
 *
 * ATTENZIONE — trasparenza sulla superficie API: le firme esatte di
 * `ImageGenerator`/`ImageGeneratorOptions` usate qui (builder, `setInputs`,
 * `execute`) sono state ricostruite dalla documentazione pubblica MediaPipe
 * e dal codice di esempio ufficiale (google-ai-edge/mediapipe-samples,
 * modulo `examples/image_generation/android`), ma questo ambiente di
 * generazione del codice non ha potuto scaricare ed eseguire una build reale
 * contro l'SDK (vedi docs/TODO.md, punto 9). Verifica le firme contro
 * l'artifact `mediapipeImageGenerator` dichiarato in
 * `gradle/libs.versions.toml` alla prima build in Android Studio: se una
 * firma è cambiata, l'errore di compilazione sarà puntuale e localizzato in
 * questo unico file, per design (è l'unico punto che tocca l'SDK MediaPipe).
 *
 * Il condizionamento "Volto"/"Full Body" tramite immagine di riferimento
 * (`ConditionOptions` in MediaPipe) NON è ancora collegato qui: non essendo
 * riuscito a verificarne la firma esatta con sufficiente certezza, non la
 * inserisco per non rischiare di inventare un'API. Vedi
 * `docs/TODO.md` punto 4 e `domain/conditioning/`.
 */
class MediaPipeImageGenerationEngine(
    private val context: Context,
    private val storage: PrivateStorageManager,
) : InferenceEngine {

    override val id: String = ENGINE_ID
    override val displayName: String = "MediaPipe Image Generation"

    private val prepareLock = Mutex()
    private var imageGenerator: ImageGenerator? = null
    private var loadedModel: AiModel? = null
    private val cancelledRequests = ConcurrentHashMap.newKeySet<String>()

    override suspend fun prepare(model: AiModel, loras: List<LoraAdapter>): EnginePrepareResult {
        if (model.engine != ENGINE_ID) {
            return EnginePrepareResult.Unavailable(
                reason = "Questo modello richiede il motore \"${model.engine}\", non MediaPipe.",
            )
        }
        return prepareLock.withLock {
            if (loadedModel?.id == model.id && imageGenerator != null) {
                return@withLock EnginePrepareResult.Ready(capabilitiesFor(model))
            }
            releaseLocked()
            try {
                val optionsBuilder = ImageGenerator.ImageGeneratorOptions.builder()
                    .setImageGeneratorModelDirectory(model.localPath)

                if (model.supportsLora && loras.isNotEmpty()) {
                    if (loras.size > 1) {
                        Log.w(TAG, "Più LoRA selezionati (${loras.size}): il motore MediaPipe ne applica uno solo per generazione, uso il primo (\"${loras.first().displayName}\").")
                    }
                    optionsBuilder.setLoraWeightsFilePath(loras.first().localPath)
                }

                val generator = ImageGenerator.createFromOptions(context, optionsBuilder.build())
                imageGenerator = generator
                loadedModel = model
                EnginePrepareResult.Ready(capabilitiesFor(model))
            } catch (oom: OutOfMemoryError) {
                releaseLocked()
                EnginePrepareResult.Unavailable(
                    reason = "Memoria insufficiente per caricare \"${model.displayName}\". Prova il profilo Base o chiudi altre app.",
                    technicalDetail = oom.toString(),
                )
            } catch (e: Exception) {
                releaseLocked()
                EnginePrepareResult.Unavailable(
                    reason = "Impossibile caricare \"${model.displayName}\": file mancanti, corrotti o formato incompatibile con questa versione del motore.",
                    technicalDetail = e.toString(),
                )
            }
        }
    }

    private fun capabilitiesFor(model: AiModel) = EngineCapabilities(
        supportsLora = model.supportsLora,
        supportsFaceConditioning = false,
        supportsFullBodyConditioning = false,
        supportedSchedulers = listOf(SchedulerType.EULER_ANCESTRAL, SchedulerType.LCM),
        minResolution = 384,
        maxResolution = model.recommendedResolution,
        maxSteps = model.maxSteps,
    )

    override fun generate(request: GenerationRequest): Flow<GenerationUpdate> = flow {
        val generator = imageGenerator
        val model = loadedModel
        if (generator == null || model == null) {
            emit(
                GenerationUpdate.Finished(
                    GenerationResult.Error(userMessage = "Nessun modello caricato: seleziona un modello prima di generare."),
                ),
            )
            return@flow
        }

        val params = request.params
        val steps = params.steps.coerceAtMost(model.maxSteps)
        val seed = params.effectiveSeed
        val startedAt = System.currentTimeMillis()

        try {
            // setInputs avvia una nuova sequenza di generazione; execute() va chiamato
            // una volta per passo di diffusione (vedi commento in cima al file sulla
            // provenienza di questa firma).
            generator.setInputs(params.positivePrompt, steps, seed.toInt())

            var lastBitmap: Bitmap? = null
            for (step in 1..steps) {
                if (!currentCoroutineContext().isActive || cancelledRequests.contains(request.id)) {
                    cancelledRequests.remove(request.id)
                    emit(GenerationUpdate.Finished(GenerationResult.Cancelled))
                    return@flow
                }

                val isLastStep = step == steps
                val stepResult = generator.execute(isLastStep)
                if (isLastStep) {
                    lastBitmap = extractBitmap(stepResult)
                }

                emit(
                    GenerationUpdate.Progress(
                        GenerationProgress(requestId = request.id, currentStep = step, totalSteps = steps),
                    ),
                )
            }

            val finalBitmap = lastBitmap
            if (finalBitmap == null) {
                emit(
                    GenerationUpdate.Finished(
                        GenerationResult.Error(
                            userMessage = "La generazione non ha prodotto un'immagine valida.",
                            technicalDetail = "execute(true) sull'ultimo passo non ha restituito un bitmap",
                        ),
                    ),
                )
                return@flow
            }

            val savedPath = storage.saveGeneratedImage(finalBitmap, requestId = request.id)
            val metadata = GenerationMetadata(
                params = params,
                engineId = id,
                engineVersion = MEDIAPIPE_ARTIFACT_VERSION,
                actualSeed = seed,
                durationMs = System.currentTimeMillis() - startedAt,
                generatedAt = System.currentTimeMillis(),
            )
            emit(GenerationUpdate.Finished(GenerationResult.Success(imagePath = savedPath, metadata = metadata)))
        } catch (c: CancellationException) {
            throw c
        } catch (oom: OutOfMemoryError) {
            emit(
                GenerationUpdate.Finished(
                    GenerationResult.Error(
                        userMessage = "Memoria insufficiente durante la generazione. Riduci risoluzione o passi, oppure passa al profilo Base.",
                        technicalDetail = oom.toString(),
                    ),
                ),
            )
        } catch (e: Exception) {
            emit(
                GenerationUpdate.Finished(
                    GenerationResult.Error(
                        userMessage = "Generazione non riuscita per un errore interno del motore.",
                        technicalDetail = e.toString(),
                        cause = e,
                    ),
                ),
            )
        } finally {
            cancelledRequests.remove(request.id)
        }
    }.flowOn(Dispatchers.Default)

    /**
     * MediaPipe non offre un'interruzione istantanea di `execute()`: la cancellazione
     * è cooperativa e ha effetto al termine del passo di diffusione in corso, non a metà.
     * Questo è comunicato in UI (vedi GenerateScreen) per non promettere un'interruzione immediata.
     */
    override fun cancel(requestId: String) {
        cancelledRequests.add(requestId)
    }

    override suspend fun release() {
        prepareLock.withLock { releaseLocked() }
    }

    private fun releaseLocked() {
        imageGenerator?.close()
        imageGenerator = null
        loadedModel = null
    }

    /**
     * Il tipo esatto restituito da `execute()` (Bitmap diretto oppure un
     * `ImageGeneratorResult` da cui estrarre l'immagine tramite `BitmapExtractor`)
     * non è stato verificabile con certezza in questo ambiente: gestiamo entrambi
     * i casi via reflection difensiva invece di assumere una firma non verificata.
     */
    private fun extractBitmap(result: Any?): Bitmap? = when (result) {
        null -> null
        is Bitmap -> result
        else -> runCatching {
            val getter = result.javaClass.methods.firstOrNull { it.name == "generatedImage" && it.parameterCount == 0 }
                ?: return@runCatching null
            val mpImage = getter.invoke(result) ?: return@runCatching null
            val extractorClass = Class.forName("com.google.mediapipe.framework.image.BitmapExtractor")
            val extractMethod = extractorClass.methods.first { it.name == "extract" }
            extractMethod.invoke(null, mpImage) as? Bitmap
        }.onFailure {
            Log.e(TAG, "Impossibile estrarre il Bitmap dal risultato di ImageGenerator.execute(): $it")
        }.getOrNull()
    }

    companion object {
        const val ENGINE_ID = "mediapipe-image-generator"
        private const val TAG = "MediaPipeEngine"

        /** Tenuto allineato a memoria con gradle/libs.versions.toml → mediapipeImageGenerator. */
        const val MEDIAPIPE_ARTIFACT_VERSION = "0.10.26.1"
    }
}
