package com.promptforge.pro.coremodel

import kotlinx.serialization.json.Json

/**
 * Istanza `Json` condivisa da tutto il progetto: usata sia per persistenza
 * (Room salva i campi complessi come colonne TEXT serializzate, vedi
 * core-database) sia per import/export manuale (§2: "esportazione/importazione
 * JSON" per Libreria e Preset). `ignoreUnknownKeys` protegge le letture da
 * versioni precedenti dello schema quando un campo viene aggiunto in futuro.
 */
object PromptForgeJson {
    val instance: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
}
