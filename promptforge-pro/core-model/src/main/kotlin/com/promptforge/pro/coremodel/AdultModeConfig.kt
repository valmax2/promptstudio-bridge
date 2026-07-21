package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

/**
 * Modello volutamente minimale: registra solo se la modalità è attiva
 * dall'utente (opt-in, disattivata di default — §6, §12) e resta un punto di
 * estensione per implementazioni future. Non definiamo qui una tassonomia di
 * concetti/intensità per contenuti sessuali espliciti: quella parte del
 * master prompt (§6) non è stata implementata, per scelta.
 */
@Serializable
data class AdultModeConfig(
    val enabled: Boolean = false,
    val schemaVersion: Int = 1,
)
