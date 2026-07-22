package com.aicreator.offline.domain.security

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/** Autenticatori richiesti: biometria forte oppure il blocco schermo del dispositivo (PIN/pattern/password) come fallback. */
private const val ALLOWED_AUTHENTICATORS = BIOMETRIC_STRONG or DEVICE_CREDENTIAL

enum class BiometricAvailability {
    DISPONIBILE,
    NESSUN_HARDWARE,
    HARDWARE_NON_PRONTO,
    NESSUNA_CREDENZIALE_CONFIGURATA,
    NON_SUPPORTATO,
}

/**
 * Blocco app tramite impronta digitale, riconoscimento biometrico o, in
 * assenza, PIN/pattern/password del dispositivo — deleghiamo il fallback PIN
 * al blocco schermo di sistema (DEVICE_CREDENTIAL) invece di reinventare uno
 * schermo PIN personalizzato, più semplice e più sicuro.
 */
class BiometricAuthManager(private val activity: FragmentActivity) {

    private val executor: Executor = Executors.newSingleThreadExecutor()

    fun availability(): BiometricAvailability {
        val manager = BiometricManager.from(activity)
        return when (manager.canAuthenticate(ALLOWED_AUTHENTICATORS)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricAvailability.DISPONIBILE
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricAvailability.NESSUN_HARDWARE
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricAvailability.HARDWARE_NON_PRONTO
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricAvailability.NESSUNA_CREDENZIALE_CONFIGURATA
            else -> BiometricAvailability.NON_SUPPORTATO
        }
    }

    fun authenticate(
        title: String,
        subtitle: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onFailed: () -> Unit,
    ) {
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(ALLOWED_AUTHENTICATORS)
            .build()

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onSuccess()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                onError(errString.toString())
            }

            override fun onAuthenticationFailed() {
                onFailed()
            }
        }

        BiometricPrompt(activity, executor, callback).authenticate(promptInfo)
    }
}
