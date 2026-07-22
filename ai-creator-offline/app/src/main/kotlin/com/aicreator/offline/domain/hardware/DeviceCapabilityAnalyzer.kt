package com.aicreator.offline.domain.hardware

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.os.StatFs

/**
 * Legge lo stato hardware del dispositivo tramite API Android pubbliche.
 * Nessuna chiamata di rete, nessun permesso oltre a quelli già dichiarati nel
 * manifest (BatteryManager/PowerManager/ActivityManager non richiedono
 * permessi runtime).
 */
class DeviceCapabilityAnalyzer(private val context: Context) {

    fun snapshot(): DeviceSnapshot {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo().also { activityManager.getMemoryInfo(it) }

        val statFs = StatFs(Environment.getDataDirectory().path)
        val freeStorageMb = (statFs.availableBytes / (1024 * 1024))

        val packageManager = context.packageManager
        val configInfo = activityManager.deviceConfigurationInfo
        val openGlEsVersion = configInfo.glEsVersion ?: "sconosciuta"
        val vulkanSupported = packageManager.hasSystemFeature(PackageManager.FEATURE_VULKAN_HARDWARE_LEVEL) ||
            packageManager.hasSystemFeature(PackageManager.FEATURE_VULKAN_HARDWARE_VERSION)

        // NNAPI è disponibile a livello di piattaforma da API 27 in poi. Non esiste
        // un'API pubblica per rilevare in modo affidabile la presenza di una NPU
        // dedicata su tutti i produttori: lo dichiariamo esplicitamente invece di indovinare.
        val nnapiAvailable = Build.VERSION.SDK_INT >= 27
        val npuNote = if (nnapiAvailable) {
            "NNAPI disponibile a livello di sistema (API ${Build.VERSION.SDK_INT}); se il dispositivo ha una NPU dedicata, NNAPI può instradarvi il calcolo automaticamente. Non è possibile confermare via API pubblica la presenza fisica di una NPU."
        } else {
            "NNAPI non disponibile su questa versione di Android: verrà usata la CPU."
        }

        val thermalStatus = readThermalStatus()
        val (batteryPercent, isCharging) = readBattery()
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val isPowerSaveMode = powerManager.isPowerSaveMode

        return DeviceSnapshot(
            androidSdkInt = Build.VERSION.SDK_INT,
            androidRelease = Build.VERSION.RELEASE ?: "sconosciuta",
            totalRamMb = (memoryInfo.totalMem / (1024 * 1024)).toInt(),
            availableRamMb = (memoryInfo.availMem / (1024 * 1024)).toInt(),
            isLowRamDevice = activityManager.isLowRamDevice,
            freeStorageMb = freeStorageMb,
            cpuCoreCount = Runtime.getRuntime().availableProcessors(),
            supportedAbis = Build.SUPPORTED_ABIS?.toList() ?: emptyList(),
            openGlEsVersion = openGlEsVersion,
            vulkanSupported = vulkanSupported,
            nnapiAvailable = nnapiAvailable,
            npuDetectionNote = npuNote,
            thermalStatus = thermalStatus,
            batteryPercent = batteryPercent,
            isCharging = isCharging,
            isPowerSaveMode = isPowerSaveMode,
            measuredAt = System.currentTimeMillis(),
        )
    }

    /** RAM libera stimata al momento della chiamata, per il controllo pre-generazione. */
    fun availableRamMb(): Int {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo().also { activityManager.getMemoryInfo(it) }
        return (memoryInfo.availMem / (1024 * 1024)).toInt()
    }

    fun isMemoryCriticallyLow(): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo().also { activityManager.getMemoryInfo(it) }
        return memoryInfo.lowMemory
    }

    private fun readThermalStatus(): ThermalStatus {
        if (Build.VERSION.SDK_INT < 29) return ThermalStatus.SCONOSCIUTO
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return when (powerManager.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE -> ThermalStatus.NORMALE
            PowerManager.THERMAL_STATUS_LIGHT -> ThermalStatus.LEGGERO
            PowerManager.THERMAL_STATUS_MODERATE -> ThermalStatus.MODERATO
            PowerManager.THERMAL_STATUS_SEVERE -> ThermalStatus.SEVERO
            PowerManager.THERMAL_STATUS_CRITICAL -> ThermalStatus.CRITICO
            PowerManager.THERMAL_STATUS_EMERGENCY -> ThermalStatus.EMERGENZA
            PowerManager.THERMAL_STATUS_SHUTDOWN -> ThermalStatus.SPEGNIMENTO_IMMINENTE
            else -> ThermalStatus.SCONOSCIUTO
        }
    }

    private fun readBattery(): Pair<Int, Boolean> {
        val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val percent = if (level >= 0 && scale > 0) (level * 100 / scale) else -1
        val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        return percent to isCharging
    }
}
