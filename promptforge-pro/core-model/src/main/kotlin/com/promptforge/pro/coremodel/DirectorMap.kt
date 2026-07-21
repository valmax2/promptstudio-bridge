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
 * metrica reale). `zoomPercent`, `cameraDistanceMeters` e `relativeView` sono
 * *derivati* da `subjectPosition`/`cameraPosition`/`subjectFacingDegrees`
 * tramite [DirectorMapGeometry] — restano campi propri (non calcolati al volo
 * a ogni lettura) perché vanno persistiti così come sono stati generati, ma è
 * responsabilità di chi muove lo stato ricalcolarli con la geometria, mai a
 * mano, per non disallinearli dalla posizione reale dei due nodi.
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
        // Soggetto al centro, camera più in basso e rivolta verso di lui: una
        // ripresa frontale a distanza media, l'inquadratura "neutra" più utile
        // come punto di partenza.
        private val DefaultSubjectPosition = OffsetRatio(0.5f, 0.5f)
        private val DefaultCameraPosition = OffsetRatio(0.5f, 0.85f)
        private const val DEFAULT_SUBJECT_FACING_DEGREES = 180f

        val Default: DirectorMapState = run {
            val distance = DirectorMapGeometry.distanceNormalized(DefaultSubjectPosition, DefaultCameraPosition)
            DirectorMapState(
                subjectPosition = DefaultSubjectPosition,
                cameraPosition = DefaultCameraPosition,
                subjectFacingDegrees = DEFAULT_SUBJECT_FACING_DEGREES,
                cameraHeightDegrees = 0f,
                cameraRollDegrees = 0f,
                cameraDistanceMeters = DirectorMapGeometry.distanceMeters(distance),
                zoomPercent = 100,
                movement = CameraMovement.Static,
                relativeView = DirectorMapGeometry.relativeView(
                    DEFAULT_SUBJECT_FACING_DEGREES,
                    DefaultSubjectPosition,
                    DefaultCameraPosition,
                ),
            )
        }
    }
}

@Serializable
data class CameraConfig(
    val lensMillimeters: Int = 35,
    val depthOfField: DepthOfField = DepthOfField.Medium,
    val schemaVersion: Int = 1,
)

enum class DepthOfField { Shallow, Medium, Deep }
