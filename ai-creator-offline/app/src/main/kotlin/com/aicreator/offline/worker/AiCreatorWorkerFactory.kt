package com.aicreator.offline.worker

import android.content.Context
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.repository.ModelRepository

/**
 * DI manuale per WorkManager: senza Hilt, i Worker con dipendenze non banali
 * vanno costruiti qui invece che tramite il costruttore vuoto di default.
 * Registrata in AiCreatorApplication (Configuration.Provider); il
 * WorkManagerInitializer automatico è rimosso dal manifest apposta.
 */
class AiCreatorWorkerFactory(
    private val modelRepository: ModelRepository,
    private val loraRepository: LoraRepository,
) : WorkerFactory() {

    override fun createWorker(
        appContext: Context,
        workerClassName: String,
        workerParameters: WorkerParameters,
    ): ListenableWorker? = when (workerClassName) {
        ModelImportWorker::class.java.name -> ModelImportWorker(appContext, workerParameters, modelRepository, loraRepository)
        ChecksumWorker::class.java.name -> ChecksumWorker(appContext, workerParameters, modelRepository)
        else -> null
    }
}
