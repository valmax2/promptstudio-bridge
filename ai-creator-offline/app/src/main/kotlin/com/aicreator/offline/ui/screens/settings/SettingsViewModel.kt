package com.aicreator.offline.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aicreator.offline.data.local.datastore.AppSettings
import com.aicreator.offline.data.local.datastore.SettingsDataStore
import com.aicreator.offline.data.local.datastore.ThemeMode
import com.aicreator.offline.domain.usecase.DeleteAllDataUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val settingsDataStore: SettingsDataStore,
    private val deleteAllDataUseCase: DeleteAllDataUseCase,
) : ViewModel() {

    val settings: StateFlow<AppSettings> = settingsDataStore.settings.stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), AppSettings(),
    )

    private val _dataDeleted = MutableStateFlow(false)
    val dataDeleted: StateFlow<Boolean> = _dataDeleted

    fun setThemeMode(mode: ThemeMode) = viewModelScope.launch { settingsDataStore.setThemeMode(mode) }
    fun setAppLockEnabled(enabled: Boolean) = viewModelScope.launch { settingsDataStore.setAppLockEnabled(enabled) }
    fun setHideRecentsPreview(enabled: Boolean) = viewModelScope.launch { settingsDataStore.setHideRecentsPreview(enabled) }
    fun setBlockScreenshots(enabled: Boolean) = viewModelScope.launch { settingsDataStore.setBlockScreenshots(enabled) }
    fun setBatterySaverPreferred(enabled: Boolean) = viewModelScope.launch { settingsDataStore.setBatterySaverPreferred(enabled) }

    fun deleteAllData() {
        viewModelScope.launch {
            deleteAllDataUseCase.execute()
            _dataDeleted.value = true
        }
    }
}
