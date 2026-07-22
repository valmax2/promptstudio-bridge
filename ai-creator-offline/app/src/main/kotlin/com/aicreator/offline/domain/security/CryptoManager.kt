package com.aicreator.offline.domain.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Genera, conserva e usa una passphrase per il database Room cifrato con
 * SQLCipher (vedi data/local/db/AppDatabase.kt). La passphrase vera e propria
 * non è mai scritta in chiaro su disco: è cifrata con una chiave AES-256-GCM
 * non esportabile conservata in Android Keystore, come richiesto ("Chiavi
 * conservate tramite Android Keystore").
 */
class CryptoManager(context: Context) {

    private val appContext = context.applicationContext
    private val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    private val passphraseFile = File(appContext.noBackupFilesDir, "db_passphrase.enc")

    /** Restituisce la passphrase del database, generandola alla prima esecuzione. */
    fun getOrCreateDatabasePassphrase(): ByteArray {
        ensureKeyExists()
        return if (passphraseFile.exists()) {
            decryptPassphrase()
        } else {
            generateAndStorePassphrase()
        }
    }

    /** Usato da "Cancella tutti i dati": distrugge la chiave e il file cifrato, rendendo il DB precedente illeggibile. */
    fun wipeDatabaseKey() {
        runCatching { keyStore.deleteEntry(KEY_ALIAS) }
        runCatching { passphraseFile.delete() }
    }

    private fun ensureKeyExists() {
        if (keyStore.containsAlias(KEY_ALIAS)) return
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            // Non leghiamo la chiave all'autenticazione biometrica: il blocco app tramite
            // biometria è un livello separato (BiometricAuthManager) sulla UI, non sull'accesso
            // al database. Se in futuro si vuole legare la chiave alla biometria, aggiungere
            // setUserAuthenticationRequired(true) qui, sapendo che la sessione DB dovrebbe
            // essere ri-aperta a ogni sblocco.
            .build()
        keyGenerator.init(spec)
        keyGenerator.generateKey()
    }

    private fun secretKey(): SecretKey =
        (keyStore.getEntry(KEY_ALIAS, null) as KeyStore.SecretKeyEntry).secretKey

    private fun generateAndStorePassphrase(): ByteArray {
        val passphrase = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val iv = cipher.iv
        val encrypted = cipher.doFinal(passphrase)
        appContext.noBackupFilesDir.mkdirs()
        passphraseFile.writeBytes(iv + encrypted)
        return passphrase
    }

    private fun decryptPassphrase(): ByteArray {
        val bytes = passphraseFile.readBytes()
        val iv = bytes.copyOfRange(0, GCM_IV_LENGTH)
        val encrypted = bytes.copyOfRange(GCM_IV_LENGTH, bytes.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return cipher.doFinal(encrypted)
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "aicreator_db_key_v1"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH_BITS = 128
    }
}
