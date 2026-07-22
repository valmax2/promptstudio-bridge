package com.aicreator.offline.domain.engine

import com.aicreator.offline.domain.model.SchedulerType

/**
 * Cosa può effettivamente fare il motore per il modello caricato. La UI usa
 * questo per abilitare/disabilitare controlli (es. nascondere LoRA se
 * [supportsLora] è false, limitare la risoluzione massima selezionabile).
 */
data class EngineCapabilities(
    val supportsLora: Boolean,
    val supportsFaceConditioning: Boolean,
    val supportsFullBodyConditioning: Boolean,
    val supportedSchedulers: List<SchedulerType>,
    val minResolution: Int,
    val maxResolution: Int,
    val maxSteps: Int,
)
