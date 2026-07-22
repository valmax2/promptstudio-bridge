package com.aicreator.offline

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aicreator.offline.data.local.datastore.AppSettings
import com.aicreator.offline.navigation.AppNavHost
import com.aicreator.offline.ui.theme.AiCreatorOfflineTheme

/**
 * FragmentActivity (non ComponentActivity semplice) perché BiometricPrompt
 * richiede una FragmentActivity/Fragment come host.
 */
class MainActivity : FragmentActivity() {

    private val container: AppContainer
        get() = (application as AiCreatorApplication).container

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val settings by container.settingsDataStore.settings.collectAsStateWithLifecycle(initialValue = AppSettings())

            // FLAG_SECURE copre sia "blocca screenshot" sia "nascondi anteprima nelle app recenti":
            // sono la stessa protezione a livello di sistema Android, non due meccanismi separati.
            LaunchedEffect(settings.blockScreenshots, settings.hideRecentsPreview) {
                if (settings.blockScreenshots || settings.hideRecentsPreview) {
                    window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
            }

            AiCreatorOfflineTheme(themeMode = settings.themeMode) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppNavHost(
                        container = container,
                        activity = this@MainActivity,
                        appLockEnabled = settings.appLockEnabled,
                    )
                }
            }
        }
    }
}
