package com.aicreator.offline.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.WorkerParameters
import com.aicreator.offline.data.local.files.ChecksumUtil
import com.aicreator.offline.domain.repository.ModelRepository
import java.io.File

/**
 * Ricalcola lo SHA-256 di un modello già importato e lo confronta con quello
 * salvato, per rilevare corruzione dello storage o modifiche manuali dei
 * file. Usato dal pulsante "Verifica integrità" nella schermata Modelli.
 */
class ChecksumWorker(
    context: Context,
    params: WorkerParameters,
    private val modelRepository: ModelRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val modelId = inputData.getString(KEY_MODEL_ID)
            ?: return Result.failure(Data.Builder().putString(KEY_ERROR_MESSAGE, "ID modello mancante.").build())

        val model = modelRepository.getModel(modelId)
            ?: return Result.failure(Data.Builder().putString(KEY_ERROR_MESSAGE, "Modello non trovato.").build())

        val packageRoot = File(model.localPath).let { modelDir ->
            // localPath punta alla sottocartella "model/": il checksum del pacchetto,
            // così come dichiarato in manifest.json, è calcolato sulla cartella intera importata,
            // quindi risaliamo di un livello quando presente questa struttura standard.
            if (modelDir.name == "model" && modelDir.parentFile != null) modelDir.parentFile!! else modelDir
        }

        if (!packageRoot.exists()) {
            return Result.failure(Data.Builder().putString(KEY_ERROR_MESSAGE, "File del modello non trovati sul dispositivo.").build())
        }

        val actualChecksum = ChecksumUtil.sha256Directory(packageRoot)
        val matches = actualChecksum.equals(model.checksumSha256, ignoreCase = true)

        val output = Data.Builder()
            .putBoolean(KEY_MATCHES, matches)
            .putString(KEY_ACTUAL_CHECKSUM, actualChecksum)
            .build()
        return Result.success(output)
    }

    companion object {
        const val KEY_MODEL_ID = "model_id"
        const val KEY_MATCHES = "matches"
        const val KEY_ACTUAL_CHECKSUM = "actual_checksum"
        const val KEY_ERROR_MESSAGE = "error_message"

        fun buildInputData(modelId: String): Data = Data.Builder().putString(KEY_MODEL_ID, modelId).build()
    }
}
