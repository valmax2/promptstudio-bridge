package com.aicreator.offline.domain.repository

import android.net.Uri
import com.aicreator.offline.domain.model.AiModel
import kotlinx.coroutines.flow.Flow

interface ModelRepository {
    fun observeModels(): Flow<List<AiModel>>
    suspend fun getModel(id: String): AiModel?

    /**
     * Importa un pacchetto modello dalla cartella SAF indicata: legge e valida
     * `manifest.json`, copia i file nello storage privato, verifica il
     * checksum. Restituisce un messaggio in italiano comprensibile in caso di
     * errore (manifest mancante, checksum non corrispondente, spazio insufficiente).
     */
    suspend fun importModel(treeUri: Uri): Result<AiModel>

    suspend fun setActive(id: String, isActive: Boolean)
    suspend fun deleteModel(id: String)

    /** Usato solo da "Cancella tutti i dati": rimuove tutti i modelli importati (voci DB + file). */
    suspend fun wipeAll()
}
