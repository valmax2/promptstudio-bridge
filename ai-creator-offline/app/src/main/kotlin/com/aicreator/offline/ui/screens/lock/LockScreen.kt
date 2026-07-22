package com.aicreator.offline.ui.screens.lock

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import com.aicreator.offline.domain.security.BiometricAuthManager
import com.aicreator.offline.domain.security.BiometricAvailability

@Composable
fun LockScreen(activity: FragmentActivity, onUnlocked: () -> Unit) {
    val authManager = remember(activity) { BiometricAuthManager(activity) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun tryAuthenticate() {
        when (authManager.availability()) {
            BiometricAvailability.DISPONIBILE -> {
                authManager.authenticate(
                    title = "Sblocca AI Creator Offline",
                    subtitle = "Usa l'impronta, il volto o il blocco schermo del dispositivo",
                    onSuccess = { errorMessage = null; onUnlocked() },
                    onError = { message -> errorMessage = message },
                    onFailed = { errorMessage = "Autenticazione non riuscita: riprova." },
                )
            }
            BiometricAvailability.NESSUNA_CREDENZIALE_CONFIGURATA ->
                errorMessage = "Nessun PIN/impronta/volto configurato sul dispositivo: configura un blocco schermo nelle impostazioni di Android per usare questa funzione."
            BiometricAvailability.NESSUN_HARDWARE, BiometricAvailability.HARDWARE_NON_PRONTO ->
                errorMessage = "Autenticazione biometrica non disponibile su questo dispositivo al momento."
            BiometricAvailability.NON_SUPPORTATO ->
                errorMessage = "Autenticazione non supportata su questo dispositivo."
        }
    }

    LaunchedEffect(Unit) { tryAuthenticate() }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.Lock, contentDescription = null, modifier = Modifier.padding(bottom = 16.dp))
        Text("AI Creator Offline è bloccata", style = MaterialTheme.typography.titleLarge)
        Text(
            "Sblocca con impronta digitale, riconoscimento biometrico o il blocco schermo del dispositivo.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
        )
        errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(bottom = 16.dp))
        }
        Button(onClick = ::tryAuthenticate) {
            Icon(Icons.Filled.Fingerprint, contentDescription = null)
            Text(" Sblocca", modifier = Modifier.padding(start = 8.dp))
        }
    }
}
