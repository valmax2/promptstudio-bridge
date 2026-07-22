package com.aicreator.offline.data.local.datastore

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.aicreator.offline.domain.model.DeviceProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException

enum class ThemeMode { CHIARO, SCURO, SISTEMA }

data class AppSettings(
    val themeMode: ThemeMode = ThemeMode.SISTEMA,
    val appLockEnabled: Boolean = false,
    val hideRecentsPreview: Boolean = true,
    val blockScreenshots: Boolean = true,
    val activeModelId: String? = null,
    val manualProfileOverride: DeviceProfile? = null,
    val batterySaverPreferred: Boolean = false,
)

private val Context.dataStore by preferencesDataStore(name = "aicreator_settings")

/**
 * Preferenze non sensibili dell'app (tema, flag privacy, modello attivo).
 * Nessun prompt, percorso di foto o dato personale viene mai scritto qui:
 * quello vive nel database cifrato (AppDatabase) o nello storage privato.
 */
class SettingsDataStore(private val context: Context) {

    private object Keys {
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val APP_LOCK_ENABLED = booleanPreferencesKey("app_lock_enabled")
        val HIDE_RECENTS_PREVIEW = booleanPreferencesKey("hide_recents_preview")
        val BLOCK_SCREENSHOTS = booleanPreferencesKey("block_screenshots")
        val ACTIVE_MODEL_ID = stringPreferencesKey("active_model_id")
        val MANUAL_PROFILE_OVERRIDE = stringPreferencesKey("manual_profile_override")
        val BATTERY_SAVER_PREFERRED = booleanPreferencesKey("battery_saver_preferred")
    }

    val settings: Flow<AppSettings> = context.dataStore.data
        .catch { error ->
            if (error is IOException) emit(emptyPreferences()) else throw error
        }
        .map { prefs ->
            AppSettings(
                themeMode = prefs[Keys.THEME_MODE]?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() } ?: ThemeMode.SISTEMA,
                appLockEnabled = prefs[Keys.APP_LOCK_ENABLED] ?: false,
                hideRecentsPreview = prefs[Keys.HIDE_RECENTS_PREVIEW] ?: true,
                blockScreenshots = prefs[Keys.BLOCK_SCREENSHOTS] ?: true,
                activeModelId = prefs[Keys.ACTIVE_MODEL_ID],
                manualProfileOverride = prefs[Keys.MANUAL_PROFILE_OVERRIDE]?.let { runCatching { DeviceProfile.valueOf(it) }.getOrNull() },
                batterySaverPreferred = prefs[Keys.BATTERY_SAVER_PREFERRED] ?: false,
            )
        }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { it[Keys.THEME_MODE] = mode.name }
    }

    suspend fun setAppLockEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.APP_LOCK_ENABLED] = enabled }
    }

    suspend fun setHideRecentsPreview(enabled: Boolean) {
        context.dataStore.edit { it[Keys.HIDE_RECENTS_PREVIEW] = enabled }
    }

    suspend fun setBlockScreenshots(enabled: Boolean) {
        context.dataStore.edit { it[Keys.BLOCK_SCREENSHOTS] = enabled }
    }

    suspend fun setActiveModelId(modelId: String?) {
        context.dataStore.edit {
            if (modelId == null) it.remove(Keys.ACTIVE_MODEL_ID) else it[Keys.ACTIVE_MODEL_ID] = modelId
        }
    }

    suspend fun setManualProfileOverride(profile: DeviceProfile?) {
        context.dataStore.edit {
            if (profile == null) it.remove(Keys.MANUAL_PROFILE_OVERRIDE) else it[Keys.MANUAL_PROFILE_OVERRIDE] = profile.name
        }
    }

    suspend fun setBatterySaverPreferred(enabled: Boolean) {
        context.dataStore.edit { it[Keys.BATTERY_SAVER_PREFERRED] = enabled }
    }

    /** Usato da "Cancella tutti i dati". */
    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
