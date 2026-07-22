package com.aicreator.offline.data.local.files

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.aicreator.offline.domain.model.LoraManifest
import com.aicreator.offline.domain.model.ModelManifest
import org.json.JSONObject
import java.io.File

/**
 * Legge e valida un pacchetto modello/LoRA scelto dall'utente tramite
 * Storage Access Framework (`ACTION_OPEN_DOCUMENT_TREE`), secondo lo schema
 * descritto in docs/MODEL_CONVERSION.md. Non fa assunzioni sul filesystem
 * sottostante: lavora solo tramite [DocumentFile] / [android.content.ContentResolver].
 */
class ModelPackageReader(private val context: Context) {

    fun readModelManifest(treeUri: Uri): Result<ModelManifest> = runCatching {
        val root = DocumentFile.fromTreeUri(context, treeUri)
            ?: throw IllegalArgumentException("Cartella non accessibile")
        val manifestDoc = root.findFile(MANIFEST_FILE_NAME)
            ?: throw IllegalArgumentException("File \"$MANIFEST_FILE_NAME\" mancante nella cartella selezionata")
        val json = readText(manifestDoc.uri)
        parseModelManifest(JSONObject(json))
    }

    fun readLoraManifest(treeUri: Uri): Result<LoraManifest> = runCatching {
        val root = DocumentFile.fromTreeUri(context, treeUri)
            ?: throw IllegalArgumentException("Cartella non accessibile")
        val manifestDoc = root.findFile(LORA_MANIFEST_FILE_NAME)
            ?: throw IllegalArgumentException("File \"$LORA_MANIFEST_FILE_NAME\" mancante nella cartella selezionata")
        val json = readText(manifestDoc.uri)
        val obj = JSONObject(json)
        LoraManifest(
            id = obj.getString("id"),
            displayName = obj.getString("displayName"),
            baseModelId = obj.getString("baseModelId"),
            sizeBytes = obj.getLong("sizeBytes"),
            checksumSha256 = obj.getString("checksumSha256"),
        )
    }

    /** Copia ricorsivamente il pacchetto dalla cartella SAF selezionata allo storage privato dell'app. */
    fun copyPackageToPrivateStorage(treeUri: Uri, destination: File): Result<Unit> = runCatching {
        val root = DocumentFile.fromTreeUri(context, treeUri)
            ?: throw IllegalArgumentException("Cartella non accessibile")
        destination.deleteRecursively()
        destination.mkdirs()
        copyRecursive(root, destination)
    }

    private fun copyRecursive(source: DocumentFile, destinationDir: File) {
        for (child in source.listFiles()) {
            val name = child.name ?: continue
            if (child.isDirectory) {
                val subDir = File(destinationDir, name).apply { mkdirs() }
                copyRecursive(child, subDir)
            } else {
                val destFile = File(destinationDir, name)
                context.contentResolver.openInputStream(child.uri)?.use { input ->
                    destFile.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("Impossibile leggere \"$name\"")
            }
        }
    }

    private fun readText(uri: Uri): String =
        context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            ?: throw IllegalStateException("Impossibile leggere il file $uri")

    private fun parseModelManifest(obj: JSONObject): ModelManifest = ModelManifest(
        id = obj.getString("id"),
        displayName = obj.getString("displayName"),
        version = if (obj.has("version")) obj.getString("version") else "1.0.0",
        engine = obj.getString("engine"),
        sizeBytes = obj.getLong("sizeBytes"),
        minRamMb = obj.getInt("minRamMb"),
        recommendedResolution = if (obj.has("recommendedResolution")) obj.getInt("recommendedResolution") else 512,
        maxSteps = if (obj.has("maxSteps")) obj.getInt("maxSteps") else 20,
        checksumSha256 = obj.getString("checksumSha256"),
        license = if (obj.has("license")) obj.getString("license") else null,
        supportsLora = if (obj.has("supportsLora")) obj.getBoolean("supportsLora") else false,
        notes = if (obj.has("notes")) obj.getString("notes") else null,
    )

    companion object {
        const val MANIFEST_FILE_NAME = "manifest.json"
        const val LORA_MANIFEST_FILE_NAME = "lora_manifest.json"
        const val MODEL_SUBDIRECTORY = "model"
    }
}
