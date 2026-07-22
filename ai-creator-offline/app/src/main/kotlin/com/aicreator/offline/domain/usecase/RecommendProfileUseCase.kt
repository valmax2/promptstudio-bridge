package com.aicreator.offline.domain.usecase

import com.aicreator.offline.domain.hardware.DeviceCapabilityAnalyzer
import com.aicreator.offline.domain.hardware.DeviceProfileRecommender
import com.aicreator.offline.domain.hardware.DeviceSnapshot
import com.aicreator.offline.domain.model.ProfileRecommendation

class RecommendProfileUseCase(private val analyzer: DeviceCapabilityAnalyzer) {

    data class Outcome(val snapshot: DeviceSnapshot, val recommendation: ProfileRecommendation)

    fun execute(): Outcome {
        val snapshot = analyzer.snapshot()
        return Outcome(snapshot = snapshot, recommendation = DeviceProfileRecommender.recommend(snapshot))
    }
}
