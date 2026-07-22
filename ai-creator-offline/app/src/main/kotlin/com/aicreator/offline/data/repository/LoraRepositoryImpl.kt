package com.aicreator.offline.data.repository

import android.net.Uri
import com.aicreator.offline.data.local.db.dao.LoraDao
import com.aicreator.offline.data.local.db.toDomain
import com.aicreator.offline.data.local.db.toEntity
import com.aicreator.offline.data.local.files.ChecksumUtil
import com.aicreator.offline.data.local.files.ModelPackageReader
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.domain.model.LoraAdapter
import com.aicreator.offline.domain.repository.LoraRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.File

class LoraRepositoryImpl(
    private val dao: LoraDao,
    private val reader: ModelPackageReader,
    private val storage: PrivateStorageManager,
) : LoraRepository {

    override fun observeLoras(): Flow<List<LoraAdapter>> = dao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observeLorasForModel(modelId: String): Flow<List<LoraAdapter>> =
        dao.observeForModel(modelId).map { list -> list.map { it.toDomain() } }

    override suspend fun getLoras(ids: List<String>): List<LoraAdapter> =
        if (ids.isEmpty()) emptyList() else dao.findByIds(ids).map { it.toDomain() }

    override suspend fun importLora(treeUri: Uri): Result<LoraAdapter> = withContext(Dispatchers.IO) {
        runCatching {
            val manifest = reader.readLoraManifest(treeUri).getOrElse { throw it }
            val destination = storage.loraDirectory(manifest.id)

            reader.copyPackageToPrivateStorage(treeUri, destination).getOrElse {
                throw IllegalStateException("Copia del LoRA non riuscita: ${it.message}", it)
            }

            val actualChecksum = ChecksumUtil.sha256Directory(destination)
            if (!actualChecksum.equals(manifest.checksumSha256, ignoreCase = true)) {
                storage.deleteLoraDirectory(manifest.id)
                throw IllegalArgumentException("Checksum del LoRA non corrispondente: import annullato.")
            }

            val weightsFile = destination.listFiles()?.firstOrNull { it.isFile }
                ?: throw IllegalArgumentException("Nessun file di pesi trovato nella cartella LoRA selezionata.")

            val lora = LoraAdapter(
                id = manifest.id,
                displayName = manifest.displayName,
                baseModelId = manifest.baseModelId,
                localPath = weightsFile.absolutePath,
                sizeBytes = manifest.sizeBytes,
                checksumSha256 = manifest.checksumSha256,
                isEnabled = true,
                importedAt = System.currentTimeMillis(),
            )
            dao.upsert(lora.toEntity())
            lora
        }
    }

    override suspend fun setEnabled(id: String, isEnabled: Boolean) = dao.setEnabled(id, isEnabled)

    override suspend fun deleteLora(id: String) {
        dao.deleteById(id)
        storage.deleteLoraDirectory(id)
    }

    override suspend fun wipeAll() = dao.deleteAll()
}
