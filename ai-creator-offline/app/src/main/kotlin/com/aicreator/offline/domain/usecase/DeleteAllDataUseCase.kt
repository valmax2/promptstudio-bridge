package com.aicreator.offline.domain.usecase

import com.aicreator.offline.data.local.datastore.SettingsDataStore
import com.aicreator.offline.data.local.db.AppDatabase
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.domain.repository.CharacterRepository
import com.aicreator.offline.domain.repository.HistoryRepository
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.repository.ModelRepository
import com.aicreator.offline.domain.repository.PresetRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Implementa il pulsante "Cancella tutti i dati" (Impostazioni e privacy):
 * svuota ogni tabella del database, i file privati (galleria, modelli, LoRA,
 * foto di riferimento) e le preferenze. Operazione irreversibile, va sempre
 * confermata dalla UI prima di essere invocata.
 */
class DeleteAllDataUseCase(
    private val modelRepository: ModelRepository,
    private val loraRepository: LoraRepository,
    private val presetRepository: PresetRepository,
    private val historyRepository: HistoryRepository,
    private val characterRepository: CharacterRepository,
    private val storage: PrivateStorageManager,
    private val settingsDataStore: SettingsDataStore,
    private val database: AppDatabase,
) {
    suspend fun execute() {
        modelRepository.wipeAll()
        loraRepository.wipeAll()
        presetRepository.wipeAll()
        historyRepository.clearAll()
        characterRepository.wipeAll()
        storage.wipeAllPrivateData()
        settingsDataStore.clearAll()
        // Le righe svuotate con DELETE restano nelle pagine libere del file cifrato finché non
        // vengono sovrascritte: senza VACUUM sarebbero in teoria ancora recuperabili con la stessa
        // chiave, contraddicendo "operazione irreversibile" promesso in UI.
        withContext(Dispatchers.IO) { database.vacuum() }
    }
}
