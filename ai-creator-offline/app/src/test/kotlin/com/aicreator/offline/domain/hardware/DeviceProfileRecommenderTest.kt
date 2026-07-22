package com.aicreator.offline.domain.hardware

import com.aicreator.offline.domain.model.DeviceProfile
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceProfileRecommenderTest {

    private fun snapshot(
        totalRamMb: Int,
        vulkanSupported: Boolean = false,
        nnapiAvailable: Boolean = true,
        thermalStatus: ThermalStatus = ThermalStatus.NORMALE,
        batteryPercent: Int = 80,
        isCharging: Boolean = false,
        isPowerSaveMode: Boolean = false,
        freeStorageMb: Long = 4096,
    ) = DeviceSnapshot(
        androidSdkInt = 34,
        androidRelease = "14",
        totalRamMb = totalRamMb,
        availableRamMb = totalRamMb / 2,
        isLowRamDevice = totalRamMb < 3072,
        freeStorageMb = freeStorageMb,
        cpuCoreCount = 8,
        supportedAbis = listOf("arm64-v8a"),
        openGlEsVersion = "3.2",
        vulkanSupported = vulkanSupported,
        nnapiAvailable = nnapiAvailable,
        npuDetectionNote = "",
        thermalStatus = thermalStatus,
        batteryPercent = batteryPercent,
        isCharging = isCharging,
        isPowerSaveMode = isPowerSaveMode,
        measuredAt = 0L,
    )

    @Test
    fun `dispositivo sotto la soglia minima disabilita la generazione`() {
        val result = DeviceProfileRecommender.recommend(snapshot(totalRamMb = 2048))
        assertEquals(0, result.maxResolution)
        assertEquals(0, result.maxSteps)
    }

    @Test
    fun `dispositivo di fascia bassa ottiene il profilo Base a 384px`() {
        val result = DeviceProfileRecommender.recommend(snapshot(totalRamMb = 3500))
        assertEquals(DeviceProfile.BASE, result.profile)
        assertEquals(384, result.maxResolution)
    }

    @Test
    fun `dispositivo di fascia alta con vulkan ottiene il profilo Realistico`() {
        val result = DeviceProfileRecommender.recommend(snapshot(totalRamMb = 10000, vulkanSupported = true))
        assertEquals(DeviceProfile.REALISTICO, result.profile)
        assertEquals(1024, result.maxResolution)
    }

    @Test
    fun `temperatura critica disattiva la generazione indipendentemente dalla RAM`() {
        val result = DeviceProfileRecommender.recommend(snapshot(totalRamMb = 10000, vulkanSupported = true, thermalStatus = ThermalStatus.CRITICO))
        assertEquals(0, result.maxSteps)
    }

    @Test
    fun `risparmio energetico riduce i passi massimi`() {
        val normal = DeviceProfileRecommender.recommend(snapshot(totalRamMb = 8500))
        val powerSave = DeviceProfileRecommender.recommend(snapshot(totalRamMb = 8500, isPowerSaveMode = true))
        assertTrue(powerSave.maxSteps <= normal.maxSteps)
    }
}
