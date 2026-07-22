package com.aicreator.offline.data.local.files

import java.io.File
import java.security.MessageDigest

/** Calcolo checksum per l'integrità dei pacchetti modello/LoRA importati. */
object ChecksumUtil {

    private const val BUFFER_SIZE = 8192

    fun sha256File(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(BUFFER_SIZE)
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().toHexString()
    }

    /**
     * Checksum deterministico di una cartella: combina lo SHA-256 di ogni file
     * (ordinati per percorso relativo) in un unico digest. Usato per validare
     * pacchetti modello multi-file dove `manifest.json` dichiara un solo
     * checksum complessivo.
     *
     * [excludeFileNames] elenca i nomi di file (solo il nome, non il percorso)
     * da NON includere nel calcolo. È indispensabile escludere il file di
     * manifest stesso: il manifest deve contenere il checksum del pacchetto,
     * quindi non può a sua volta rientrare nell'impronta che dichiara
     * (altrimenti il valore non sarebbe mai calcolabile né verificabile).
     * L'algoritmo è replicato identico in tools/make_model_package.py, che
     * genera i pacchetti lato PC.
     */
    fun sha256Directory(directory: File, excludeFileNames: Set<String> = emptySet()): String {
        require(directory.isDirectory) { "${directory.path} non è una cartella" }
        val digest = MessageDigest.getInstance("SHA-256")
        directory.walkTopDown()
            .filter { it.isFile && it.name !in excludeFileNames }
            .sortedBy { it.relativeTo(directory).path.replace(File.separatorChar, '/') }
            .forEach { file ->
                val relativePath = file.relativeTo(directory).path.replace(File.separatorChar, '/')
                digest.update(relativePath.toByteArray(Charsets.UTF_8))
                digest.update(sha256File(file).toByteArray(Charsets.UTF_8))
            }
        return digest.digest().toHexString()
    }

    private fun ByteArray.toHexString(): String = joinToString(separator = "") { byte ->
        "%02x".format(byte)
    }
}
