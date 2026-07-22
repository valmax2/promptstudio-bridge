package com.aicreator.offline.domain.hardware

import com.aicreator.offline.domain.model.AiModel

/** Stima di compatibilità di un modello con il dispositivo corrente, per la schermata Modelli. */
fun estimateCompatibility(model: AiModel, snapshot: DeviceSnapshot): AiModel.Compatibility {
    val ramMargin = snapshot.totalRamMb - model.minRamMb
    return when {
        ramMargin < 0 -> AiModel.Compatibility.INCOMPATIBILE
        ramMargin < 1024 -> AiModel.Compatibility.MARGINALE
        else -> AiModel.Compatibility.COMPATIBLE
    }
}
