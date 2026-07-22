package com.aicreator.offline.data.local.files

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Environment
import android.os.StatFs
import com.aicreator.offline.domain.model.ExportFormat
import java.io.File
import java.security.SecureRandom
import java.util.UUID

/**
 * Unico punto di accesso allo storage privato dell'app (galleria interna,
 * modelli importati, foto di riferimento personaggio). Tutto vive sotto
 * `context.filesDir`, quindi cancellato automaticamente alla disinstallazione
 * e non accessibile ad altre app senza root.
 */
class PrivateStorageManager(private val context: Context) {

    private val galleryDir = File(context.filesDir, "gallery").also { it.mkdirs() }
    private val modelsRootDir = File(context.filesDir, "models").also { it.mkdirs() }
    private val lorasRootDir = File(context.filesDir, "loras").also { it.mkdirs() }
    private val referencesDir = File(context.filesDir, "character_refs").also { it.mkdirs() }

    fun modelDirectory(modelId: String): File = File(modelsRootDir, modelId).also { it.mkdirs() }
    fun loraDirectory(loraId: String): File = File(lorasRootDir, loraId).also { it.mkdirs() }

    fun saveGeneratedImage(bitmap: Bitmap, requestId: String): String {
        val file = File(galleryDir, "$requestId.png")
        file.outputStream().use { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, out) }
        return file.absolutePath
    }

    fun copyReferenceImage(sourceUri: Uri): String {
        val destination = File(referencesDir, "${UUID.randomUUID()}.jpg")
        context.contentResolver.openInputStream(sourceUri)?.use { input ->
            val bitmap = BitmapFactory.decodeStream(input)
                ?: throw IllegalArgumentException("Immagine non leggibile o formato non supportato")
            destination.outputStream().use { out -> bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out) }
        } ?: throw IllegalArgumentException("Impossibile aprire l'immagine selezionata")
        return destination.absolutePath
    }

    /**
     * Esporta un'immagine della galleria interna verso una destinazione scelta
     * dall'utente tramite Storage Access Framework (`ACTION_CREATE_DOCUMENT`).
     * Azione sempre manuale: nessun export automatico o in background.
     */
    fun exportImage(sourcePath: String, destinationUri: Uri, format: ExportFormat): Result<Unit> = runCatching {
        val bitmap = BitmapFactory.decodeFile(sourcePath)
            ?: throw IllegalStateException("Immagine sorgente non trovata: $sourcePath")
        context.contentResolver.openOutputStream(destinationUri)?.use { out ->
            val quality = if (format == ExportFormat.PNG) 100 else 92
            bitmap.compress(format.compressFormat, quality, out)
        } ?: throw IllegalStateException("Impossibile scrivere sulla destinazione selezionata")
    }

    /** Cancellazione sicura: sovrascrive il contenuto con byte casuali prima di eliminare il file. */
    fun secureDelete(path: String): Boolean {
        val file = File(path)
        if (!file.exists()) return false
        return runCatching {
            val length = file.length()
            if (length > 0) {
                file.outputStream().use { out ->
                    val random = SecureRandom()
                    val buffer = ByteArray(minOf(length, 1 shl 20).toInt())
                    var remaining = length
                    while (remaining > 0) {
                        random.nextBytes(buffer)
                        val toWrite = minOf(remaining, buffer.size.toLong()).toInt()
                        out.write(buffer, 0, toWrite)
                        remaining -= toWrite
                    }
                    out.flush()
                }
            }
            file.delete()
        }.getOrDefault(false)
    }

    fun freeInternalStorageMb(): Long {
        val statFs = StatFs(Environment.getDataDirectory().path)
        return statFs.availableBytes / (1024 * 1024)
    }

    fun directorySizeMb(directory: File): Long =
        directory.walkTopDown().filter { it.isFile }.sumOf { it.length() } / (1024 * 1024)

    /** Usato da "Cancella tutti i dati": rimuove galleria, riferimenti e modelli importati (non le impostazioni, cancellate separatamente). */
    fun wipeAllPrivateData() {
        galleryDir.deleteRecursively()
        modelsRootDir.deleteRecursively()
        lorasRootDir.deleteRecursively()
        referencesDir.deleteRecursively()
        galleryDir.mkdirs()
        modelsRootDir.mkdirs()
        lorasRootDir.mkdirs()
        referencesDir.mkdirs()
    }

    fun deleteModelDirectory(modelId: String) {
        modelDirectory(modelId).deleteRecursively()
    }

    fun deleteLoraDirectory(loraId: String) {
        loraDirectory(loraId).deleteRecursively()
    }
}
