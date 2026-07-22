package com.aicreator.offline.domain.hardware

import com.aicreator.offline.domain.model.DeviceProfile
import com.aicreator.offline.domain.model.ProfileRecommendation

/**
 * Funzione pura: nessuna dipendenza da Context, quindi testabile con JUnit
 * puro (vedi app/src/test). Le soglie sono documentate in docs/FEASIBILITY.md
 * §4 e sono stime di progettazione, non garanzie.
 */
object DeviceProfileRecommender {

    private const val MIN_SUPPORTED_RAM_MB = 3072

    fun recommend(snapshot: DeviceSnapshot): ProfileRecommendation {
        val disabled = mutableListOf<String>()

        if (snapshot.totalRamMb < MIN_SUPPORTED_RAM_MB) {
            return ProfileRecommendation(
                profile = DeviceProfile.BASE,
                maxResolution = 0,
                maxSteps = 0,
                disabledFeatures = listOf("Generazione immagini (RAM sotto la soglia minima)"),
                reasoning = "RAM totale ${snapshot.totalRamMb} MB, sotto la soglia minima consigliata di $MIN_SUPPORTED_RAM_MB MB. " +
                    "La generazione locale su questo dispositivo è troppo rischiosa (crash/OOM molto probabili) e resta disattivata.",
            )
        }

        var profile: DeviceProfile
        var maxResolution: Int
        var maxSteps: Int

        when {
            snapshot.totalRamMb < 4096 -> {
                profile = DeviceProfile.BASE
                maxResolution = 384
                maxSteps = 12
                disabled += "Modalità Realistico"
                disabled += "Full Body"
                disabled += "Upscaling locale"
            }
            snapshot.totalRamMb < 6144 -> {
                profile = if (snapshot.vulkanSupported) DeviceProfile.BILANCIATO else DeviceProfile.BASE
                maxResolution = 512
                maxSteps = if (snapshot.vulkanSupported) 18 else 15
                disabled += "Upscaling locale"
            }
            snapshot.totalRamMb < 8192 -> {
                profile = DeviceProfile.BILANCIATO
                maxResolution = 640
                maxSteps = 22
            }
            else -> {
                profile = if (snapshot.vulkanSupported || snapshot.nnapiAvailable) DeviceProfile.REALISTICO else DeviceProfile.BILANCIATO
                maxResolution = if (snapshot.vulkanSupported) 1024 else 768
                maxSteps = 30
            }
        }

        if (snapshot.thermalStatus == ThermalStatus.MODERATO || snapshot.thermalStatus == ThermalStatus.SEVERO) {
            profile = downgrade(profile)
            maxSteps = (maxSteps * 0.7f).toInt().coerceAtLeast(8)
            disabled += "Upscaling locale (temperatura elevata)"
        } else if (snapshot.thermalStatus == ThermalStatus.CRITICO || snapshot.thermalStatus == ThermalStatus.EMERGENZA || snapshot.thermalStatus == ThermalStatus.SPEGNIMENTO_IMMINENTE) {
            return ProfileRecommendation(
                profile = DeviceProfile.BASE,
                maxResolution = 0,
                maxSteps = 0,
                disabledFeatures = listOf("Generazione immagini (temperatura dispositivo critica)"),
                reasoning = "Il dispositivo è in stato termico critico: la generazione resta disattivata finché non si raffredda.",
            )
        }

        if (snapshot.isPowerSaveMode) {
            maxSteps = maxSteps.coerceAtMost(12)
            disabled += "Generazioni multiple consecutive (risparmio batteria attivo)"
        }

        if (snapshot.batteryPercent in 1..14 && !snapshot.isCharging) {
            maxSteps = maxSteps.coerceAtMost(10)
            disabled += "Modalità Realistico (batteria scarica)"
            if (profile == DeviceProfile.REALISTICO) profile = DeviceProfile.BILANCIATO
        }

        if (snapshot.freeStorageMb < 500) {
            disabled += "Import di nuovi modelli (spazio libero insufficiente)"
        }

        val reasoning = "RAM totale ${snapshot.totalRamMb} MB, Vulkan=${snapshot.vulkanSupported}, " +
            "NNAPI=${snapshot.nnapiAvailable}, stato termico=${snapshot.thermalStatus}, " +
            "batteria=${snapshot.batteryPercent}%${if (snapshot.isCharging) " (in carica)" else ""}."

        return ProfileRecommendation(
            profile = profile,
            maxResolution = maxResolution,
            maxSteps = maxSteps,
            disabledFeatures = disabled.distinct(),
            reasoning = reasoning,
        )
    }

    private fun downgrade(profile: DeviceProfile): DeviceProfile = when (profile) {
        DeviceProfile.REALISTICO -> DeviceProfile.BILANCIATO
        DeviceProfile.BILANCIATO -> DeviceProfile.BASE
        DeviceProfile.BASE -> DeviceProfile.BASE
    }
}
