package com.aicreator.offline.worker

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.WorkerParameters
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.repository.ModelRepository

/**
 * Import di un pacchetto modello/LoRA come lavoro WorkManager: la copia dei
 * file (potenzialmente diversi GB) sopravvive così a un cambio di
 * configurazione o a un breve passaggio in background dell'app, invece di
 * essere legata al ciclo di vita di una singola schermata.
 */
class ModelImportWorker(
    context: Context,
    params: WorkerParameters,
    private val modelRepository: ModelRepository,
    private val loraRepository: LoraRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // Tutto il corpo è protetto da questo try/catch: le repository già
        // convertono i propri errori in Result.failure, ma qualunque eccezione
        // che sfuggisse comunque (es. da DocumentFile/SAF) andrebbe altrimenti
        // a produrre un WorkInfo FAILED senza outputData, mostrando nell'app
        // solo un messaggio generico senza nessun dettaglio diagnosticabile.
        return try {
            val treeUriString = inputData.getString(KEY_TREE_URI) ?: return Result.failure(
                errorData("Nessuna cartella selezionata."),
            )
            val kind = inputData.getString(KEY_IMPORT_KIND) ?: KIND_MODEL
            val treeUri = Uri.parse(treeUriString)

            val outcome = if (kind == KIND_LORA) {
                loraRepository.importLora(treeUri).map { it.id }
            } else {
                modelRepository.importModel(treeUri).map { it.id }
            }

            outcome.fold(
                onSuccess = { id -> Result.success(Data.Builder().putString(KEY_RESULT_ID, id).build()) },
                onFailure = { error -> Result.failure(errorData(describe(error))) },
            )
        } catch (cancellation: kotlinx.coroutines.CancellationException) {
            throw cancellation
        } catch (error: Throwable) {
            Result.failure(errorData(describe(error)))
        }
    }

    private fun describe(error: Throwable): String =
        error.message ?: "${error::class.simpleName}: nessun dettaglio disponibile."

    private fun errorData(message: String) = Data.Builder().putString(KEY_ERROR_MESSAGE, message).build()

    companion object {
        const val KEY_TREE_URI = "tree_uri"
        const val KEY_IMPORT_KIND = "import_kind"
        const val KEY_RESULT_ID = "result_id"
        const val KEY_ERROR_MESSAGE = "error_message"
        const val KIND_MODEL = "MODEL"
        const val KIND_LORA = "LORA"

        fun buildInputData(treeUri: Uri, kind: String): Data = Data.Builder()
            .putString(KEY_TREE_URI, treeUri.toString())
            .putString(KEY_IMPORT_KIND, kind)
            .build()
    }
}
