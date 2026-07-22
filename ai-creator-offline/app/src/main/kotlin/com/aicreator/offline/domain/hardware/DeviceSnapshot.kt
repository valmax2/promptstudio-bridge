package com.aicreator.offline.domain.hardware

/**
 * Stato termico del dispositivo. Android non espone una temperatura in gradi
 * tramite API pubblica senza permessi di sistema/root: usiamo la categoria
 * ufficiale [android.os.PowerManager.getCurrentThermalStatus] (API 29+),
 * l'unica fonte pubblica e affidabile. Su API < 29 risulta sempre SCONOSCIUTO.
 */
enum class ThermalStatus {
    SCONOSCIUTO,
    NORMALE,
    LEGGERO,
    MODERATO,
    SEVERO,
    CRITICO,
    EMERGENZA,
    SPEGNIMENTO_IMMINENTE,
}

/**
 * Fotografia dello stato hardware del dispositivo al momento della misura.
 * Tutti i valori sono letti da API pubbliche Android; nessun dato lascia
 * il dispositivo (usato solo per calcolare [com.aicreator.offline.domain.model.ProfileRecommendation]
 * e per la schermata Diagnostica).
 */
data class DeviceSnapshot(
    val androidSdkInt: Int,
    val androidRelease: String,
    val totalRamMb: Int,
    val availableRamMb: Int,
    val isLowRamDevice: Boolean,
    val freeStorageMb: Long,
    val cpuCoreCount: Int,
    val supportedAbis: List<String>,
    val openGlEsVersion: String,
    val vulkanSupported: Boolean,
    val nnapiAvailable: Boolean,
    /** Il rilevamento di una NPU dedicata non ha un'API pubblica universale: nota esplicita invece di un booleano inventato. */
    val npuDetectionNote: String,
    val thermalStatus: ThermalStatus,
    val batteryPercent: Int,
    val isCharging: Boolean,
    val isPowerSaveMode: Boolean,
    val measuredAt: Long,
)
