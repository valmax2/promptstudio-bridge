package com.aicreator.offline.domain.model

/**
 * Profilo di generazione consigliato/scelto. "Bilanciato" è il livello
 * intermedio richiesto dalla diagnostica hardware oltre a Base e Realistico.
 */
enum class DeviceProfile(val label: String) {
    BASE("Base"),
    BILANCIATO("Bilanciato"),
    REALISTICO("Realistico"),
}

/**
 * Raccomandazione calcolata da [com.aicreator.offline.domain.hardware.DeviceProfileRecommender]
 * a partire da uno snapshot hardware reale.
 */
data class ProfileRecommendation(
    val profile: DeviceProfile,
    val maxResolution: Int,
    val maxSteps: Int,
    val disabledFeatures: List<String>,
    val reasoning: String,
)
