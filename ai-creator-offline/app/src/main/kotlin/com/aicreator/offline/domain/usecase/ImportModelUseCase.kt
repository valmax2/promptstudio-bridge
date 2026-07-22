package com.aicreator.offline.domain.usecase

import android.content.Context
import android.net.Uri
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.aicreator.offline.worker.ModelImportWorker
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filterNotNull

/**
 * Avvia l'import di un pacchetto modello o LoRA come lavoro WorkManager (vedi
 * ModelImportWorker), così la copia di file potenzialmente grandi non è
 * legata al ciclo di vita di una singola schermata Compose.
 */
class ImportModelUseCase(private val context: Context) {

    fun enqueueModelImport(treeUri: Uri): Flow<WorkInfo> = enqueue(treeUri, ModelImportWorker.KIND_MODEL)

    fun enqueueLoraImport(treeUri: Uri): Flow<WorkInfo> = enqueue(treeUri, ModelImportWorker.KIND_LORA)

    private fun enqueue(treeUri: Uri, kind: String): Flow<WorkInfo> {
        val request = OneTimeWorkRequestBuilder<ModelImportWorker>()
            .setInputData(ModelImportWorker.buildInputData(treeUri, kind))
            .build()
        val workManager = WorkManager.getInstance(context)
        workManager.enqueue(request)
        return workManager.getWorkInfoByIdFlow(request.id).filterNotNull()
    }
}
