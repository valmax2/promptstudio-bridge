package com.promptforge.pro.coremodel

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Geometria pura della Director Map (§3). Nessuna dipendenza da Compose/Android:
 * tutta la matematica vive qui apposta, per poterla testare davvero su JVM —
 * la UI (feature-director-map) chiama solo queste funzioni, non ricalcola
 * nulla per conto suo.
 *
 * Convenzione angoli: gradi bussola, 0°=nord (verso l'alto dello schermo nella
 * vista dall'alto), crescono in senso orario (90°=est/destra, 180°=sud/basso,
 * 270°=ovest/sinistra). `subjectFacingDegrees` segue la stessa convenzione.
 *
 * La vista dall'alto governa bearing e distanza; la vista laterale governa
 * solo `cameraHeightDegrees` (elevazione, -90°=dal basso, 0°=altezza occhi,
 * +90°=dall'alto) — le due viste leggono/scrivono campi diversi dello stesso
 * [DirectorMapState], quindi restano sempre coerenti senza bisogno di
 * sincronizzazione esplicita.
 */
object DirectorMapGeometry {

    /** A quanti metri "di scena" corrisponde un'unità di distanza normalizzata (a zoom 100%). */
    private const val METERS_PER_NORMALIZED_UNIT = 10f

    // Pubbliche: la UI le usa per impostare i range di slider/gesture (es. Slider
    // dello zoom, larghezza utile della vista laterale), non solo internamente.
    const val MIN_ZOOM_PERCENT = 20
    const val MAX_ZOOM_PERCENT = 400
    const val MIN_NORMALIZED_DISTANCE = 0.03f
    const val MAX_NORMALIZED_DISTANCE = 0.9f

    fun distanceNormalized(a: OffsetRatio, b: OffsetRatio): Float =
        hypot((b.x - a.x).toDouble(), (b.y - a.y).toDouble()).toFloat()

    fun distanceMeters(normalizedDistance: Float): Float = normalizedDistance * METERS_PER_NORMALIZED_UNIT

    /** Bearing bussola (0..360, 0=nord) dal punto `from` al punto `to`. */
    fun bearingDegrees(from: OffsetRatio, to: OffsetRatio): Float {
        val dx = (to.x - from.x).toDouble()
        // y cresce verso il basso sullo schermo, quindi va invertito per ottenere
        // "nord = verso l'alto" nella convenzione bussola.
        val dy = -(to.y - from.y).toDouble()
        if (dx == 0.0 && dy == 0.0) return 0f
        val radians = atan2(dx, dy) // atan2(x, y) invertito apposta: dà 0 quando dy>0 (nord)
        return normalizeDegrees(Math.toDegrees(radians).toFloat())
    }

    /** Vista relativa del soggetto rispetto alla camera (§3), dedotta dai due bearing. */
    fun relativeView(subjectFacingDegrees: Float, subjectPosition: OffsetRatio, cameraPosition: OffsetRatio): RelativeSubjectView {
        val cameraBearingFromSubject = bearingDegrees(subjectPosition, cameraPosition)
        val diff = normalizeDegrees(cameraBearingFromSubject - subjectFacingDegrees)
        // diff=0: camera nella stessa direzione in cui guarda il soggetto -> è di fronte al soggetto (lo vede in faccia).
        // diff=180: camera dietro il soggetto, che le volta le spalle -> vista posteriore.
        return when {
            diff <= 22.5f || diff >= 337.5f -> RelativeSubjectView.Front
            diff in 67.5f..112.5f || diff in 247.5f..292.5f -> RelativeSubjectView.Profile
            diff in 157.5f..202.5f -> RelativeSubjectView.Back
            else -> RelativeSubjectView.ThreeQuarter
        }
    }

    fun zoomPercentFor(normalizedDistance: Float, baseDistance: Float): Int {
        val safeDistance = normalizedDistance.coerceAtLeast(MIN_NORMALIZED_DISTANCE)
        return ((baseDistance / safeDistance) * 100f).roundToInt().coerceIn(MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT)
    }

    fun normalizedDistanceForZoom(zoomPercent: Int, baseDistance: Float): Float {
        val safeZoom = zoomPercent.coerceIn(MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT)
        return (baseDistance * 100f / safeZoom).coerceIn(MIN_NORMALIZED_DISTANCE, MAX_NORMALIZED_DISTANCE)
    }

    /**
     * Ricalcola la posizione della camera lungo lo stesso bearing attuale, a una
     * nuova distanza. Usata quando la barra dello zoom viene spostata (§3: "la
     * barra zoom deve spostare fisicamente il nodo camera lungo la linea").
     */
    fun cameraPositionAtDistance(subjectPosition: OffsetRatio, bearingDegrees: Float, normalizedDistance: Float): OffsetRatio {
        val radians = Math.toRadians(bearingDegrees.toDouble())
        val rawX = subjectPosition.x + (sin(radians) * normalizedDistance).toFloat()
        val rawY = subjectPosition.y - (cos(radians) * normalizedDistance).toFloat()
        return clampToUnitSquare(rawX, rawY)
    }

    /**
     * §3: "limitare i nodi ai bordi della superficie". Prende coordinate grezze
     * (non ancora un [OffsetRatio], che per costruzione è già sempre 0..1) — è
     * pensata per essere chiamata anche dalla UI sui valori grezzi che arrivano
     * dai gesture di trascinamento, prima di costruire l'[OffsetRatio].
     */
    fun clampToUnitSquare(x: Float, y: Float): OffsetRatio =
        OffsetRatio(x = x.coerceIn(0f, 1f), y = y.coerceIn(0f, 1f))

    /** Elevazione (gradi) <-> posizione verticale normalizzata nella vista laterale (-1 sotto, 0 occhi, +1 sopra). */
    fun heightDegreesFromElevationRatio(elevationRatio: Float): Float = elevationRatio.coerceIn(-1f, 1f) * 90f

    fun elevationRatioFromHeightDegrees(heightDegrees: Float): Float = (heightDegrees / 90f).coerceIn(-1f, 1f)

    /**
     * §3: "prevedere Reset e Inverti lati". Inverti lati riflette la camera
     * sull'asse verso cui guarda il soggetto (bearing' = 2×facing - bearing),
     * a parità di distanza e altezza: es. un tre-quarti da sinistra diventa da
     * destra, mantenendo la stessa inquadratura.
     */
    fun invertCameraSide(state: DirectorMapState): DirectorMapState {
        val currentBearing = bearingDegrees(state.subjectPosition, state.cameraPosition)
        val mirroredBearing = normalizeDegrees(2 * state.subjectFacingDegrees - currentBearing)
        val distance = distanceNormalized(state.subjectPosition, state.cameraPosition)
        val mirroredPosition = cameraPositionAtDistance(state.subjectPosition, mirroredBearing, distance)
        return state.copy(
            cameraPosition = mirroredPosition,
            relativeView = relativeView(state.subjectFacingDegrees, state.subjectPosition, mirroredPosition),
        )
    }

    private fun normalizeDegrees(degrees: Float): Float {
        val mod = degrees % 360f
        return if (mod < 0f) mod + 360f else mod
    }
}
