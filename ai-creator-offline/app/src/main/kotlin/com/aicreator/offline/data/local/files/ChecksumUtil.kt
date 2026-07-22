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
     */
    fun sha256Directory(directory: File): String {
        require(directory.isDirectory) { "${directory.path} non è una cartella" }
        val digest = MessageDigest.getInstance("SHA-256")
        directory.walkTopDown()
            .filter { it.isFile }
            .sortedBy { it.relativeTo(directory).path }
            .forEach { file ->
                digest.update(file.relativeTo(directory).path.toByteArray(Charsets.UTF_8))
                digest.update(sha256File(file).toByteArray(Charsets.UTF_8))
            }
        return digest.digest().toHexString()
    }

    private fun ByteArray.toHexString(): String = joinToString(separator = "") { byte ->
        "%02x".format(byte)
    }
}
