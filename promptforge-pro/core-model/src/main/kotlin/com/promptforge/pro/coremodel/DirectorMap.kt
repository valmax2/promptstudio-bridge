package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

/** Coordinata normalizzata 0..1, indipendente dalle dimensioni reali dello schermo (§3). */
@Serializable
data class OffsetRatio(val x: Float, val y: Float) {
    init {
        require(x in 0f..1f) { "x fuori range 0..1: $x" }
        require(y in 0f..1f) { "y fuori range 0..1: $y" }
    }
}

enum class CameraMovement {
    Static, Dolly, Pan, Tilt, Crane, Orbit, Tracking, WhipPan, Handheld, Steadicam, Drone, DollyZoom,
}

enum class RelativeSubjectView {
    Front, ThreeQuarter, Profile, Back,
}

/**
 * Stato geometrico della Director Map (§3). Tutti gli angoli in gradi, la
 * distanza in metri "di scena" (unità arbitraria coerente col prompt, non
 * metrica reale). `zoomPercent` e `cameraDistanceMeters` sono tenuti in
 * sincronia dal livello che possiede lo stato (feature-director-map), non qui.
 */
@Serializable
data class DirectorMapState(
    val subjectPosition: OffsetRatio,
    val cameraPosition: OffsetRatio,
    val subjectFacingDegrees: Float,
    val cameraHeightDegrees: Float,
    val cameraRollDegrees: Float,
    val cameraDistanceMeters: Float,
    val zoomPercent: Int,
    val movement: CameraMovement,
    val relativeView: RelativeSubjectView,
    val schemaVersion: Int = 1,
) {
    companion object {
        val Default = DirectorMapState(
            subjectPosition = OffsetRatio(0.5f, 0.5f),
            cameraPosition = OffsetRatio(0.5f, 0.85f),
            subjectFacingDegrees = 0f,
            cameraHeightDegrees = 0f,
            cameraRollDegrees = 0f,
            cameraDistanceMeters = 3f,
            zoomPercent = 100,
            movement = CameraMovement.Static,
            relativeView = RelativeSubjectView.Front,
        )
    }
}

@Serializable
data class CameraConfig(
    val lensMillimeters: Int = 35,
    val depthOfField: DepthOfField = DepthOfField.Medium,
    val schemaVersion: Int = 1,
)

enum class DepthOfField { Shallow, Medium, Deep }
