package com.aicreator.offline.data.repository

import android.net.Uri
import com.aicreator.offline.data.local.db.dao.ModelDao
import com.aicreator.offline.data.local.db.toDomain
import com.aicreator.offline.data.local.db.toEntity
import com.aicreator.offline.data.local.files.ChecksumUtil
import com.aicreator.offline.data.local.files.ModelPackageReader
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.domain.model.AiModel
import com.aicreator.offline.domain.repository.ModelRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.File

class ModelRepositoryImpl(
    private val dao: ModelDao,
    private val reader: ModelPackageReader,
    private val storage: PrivateStorageManager,
) : ModelRepository {

    override fun observeModels(): Flow<List<AiModel>> = dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun getModel(id: String): AiModel? = dao.findById(id)?.toDomain()

    override suspend fun importModel(treeUri: Uri): Result<AiModel> = withContext(Dispatchers.IO) {
        runCatching {
            val manifest = reader.readModelManifest(treeUri).getOrElse { throw it }
            val existing = dao.findById(manifest.id)
            val destination = storage.modelDirectory(manifest.id)

            reader.copyPackageToPrivateStorage(treeUri, destination).getOrElse {
                throw IllegalStateException("Copia del pacchetto non riuscita: ${it.message}", it)
            }

            val actualChecksum = ChecksumUtil.sha256Directory(destination)
            if (!actualChecksum.equals(manifest.checksumSha256, ignoreCase = true)) {
                storage.deleteModelDirectory(manifest.id)
                throw IllegalArgumentException(
                    "Il checksum del pacchetto non corrisponde a manifest.json: il file potrebbe essere corrotto o alterato. Import annullato.",
                )
            }

            val bundleDir = File(destination, ModelPackageReader.MODEL_SUBDIRECTORY)
            val localPath = if (bundleDir.exists()) bundleDir.absolutePath else destination.absolutePath

            val model = AiModel(
                id = manifest.id,
                displayName = manifest.displayName,
                engine = manifest.engine,
                sourceFolderUri = treeUri.toString(),
                localPath = localPath,
                sizeBytes = manifest.sizeBytes,
                minRamMb = manifest.minRamMb,
                recommendedResolution = manifest.recommendedResolution,
                maxSteps = manifest.maxSteps,
                checksumSha256 = manifest.checksumSha256,
                license = manifest.license,
                supportsLora = manifest.supportsLora,
                isActive = existing?.isActive ?: true,
                importedAt = System.currentTimeMillis(),
            )
            dao.upsert(model.toEntity())
            model
        }
    }

    override suspend fun setActive(id: String, isActive: Boolean) = dao.setActive(id, isActive)

    override suspend fun deleteModel(id: String) {
        val entity = dao.findById(id) ?: return
        dao.delete(entity)
        storage.deleteModelDirectory(id)
    }

    override suspend fun wipeAll() = dao.deleteAll()
}
