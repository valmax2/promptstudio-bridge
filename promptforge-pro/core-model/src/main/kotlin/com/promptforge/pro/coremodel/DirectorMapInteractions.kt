package com.promptforge.pro.coremodel

/**
 * Contratto tra la UI (Compose Canvas, gesture di trascinamento) e lo stato
 * geometrico: ogni interazione dell'utente sulla Director Map passa da qui,
 * mai da un ricalcolo ad-hoc nella UI. Così la logica resta negli unici
 * moduli Kotlin puri testabili localmente (core-model/prompt-engine — vedi
 * promptforge-pro/README.md sul perché questo vincolo esiste in questo
 * progetto).
 */
object DirectorMapInteractions {

    /**
     * Distanza di riferimento per il 100% di zoom, fissa per tutta la sessione
     * (non ricalcolata a ogni trascinamento): altrimenti "100% di zoom"
     * cambierebbe significato a ogni gesture, che è confusionario. Coincide
     * con la distanza di [DirectorMapState.Default].
     */
    const val REFERENCE_NORMALIZED_DISTANCE = 0.35f

    /** Vista dall'alto: trascinamento del nodo soggetto. */
    fun moveSubject(state: DirectorMapState, rawX: Float, rawY: Float): DirectorMapState {
        val newSubjectPosition = DirectorMapGeometry.clampToUnitSquare(rawX, rawY)
        return recomputeDerivedFields(state.copy(subjectPosition = newSubjectPosition))
    }

    /** Vista dall'alto: trascinamento del nodo camera (cambia bearing e/o distanza). */
    fun moveCamera(state: DirectorMapState, rawX: Float, rawY: Float): DirectorMapState {
        val newCameraPosition = DirectorMapGeometry.clampToUnitSquare(rawX, rawY)
        return recomputeDerivedFields(state.copy(cameraPosition = newCameraPosition))
    }

    /** Slider zoom: sposta fisicamente la camera lungo lo stesso bearing (§3). */
    fun setZoomPercent(state: DirectorMapState, zoomPercent: Int): DirectorMapState {
        val bearing = DirectorMapGeometry.bearingDegrees(state.subjectPosition, state.cameraPosition)
        val newDistance = DirectorMapGeometry.normalizedDistanceForZoom(zoomPercent, REFERENCE_NORMALIZED_DISTANCE)
        val newCameraPosition = DirectorMapGeometry.cameraPositionAtDistance(state.subjectPosition, bearing, newDistance)
        return recomputeDerivedFields(state.copy(cameraPosition = newCameraPosition))
    }

    /** Vista laterale: trascinamento verticale del nodo camera (altezza/elevazione). */
    fun setElevationRatio(state: DirectorMapState, elevationRatio: Float): DirectorMapState =
        state.copy(cameraHeightDegrees = DirectorMapGeometry.heightDegreesFromElevationRatio(elevationRatio))

    fun setRollDegrees(state: DirectorMapState, rollDegrees: Float): DirectorMapState =
        state.copy(cameraRollDegrees = rollDegrees)

    fun setMovement(state: DirectorMapState, movement: CameraMovement): DirectorMapState =
        state.copy(movement = movement)

    fun setSubjectFacing(state: DirectorMapState, facingDegrees: Float): DirectorMapState =
        recomputeDerivedFields(state.copy(subjectFacingDegrees = facingDegrees))

    fun reset(): DirectorMapState = DirectorMapState.Default

    /** §3: "Inverti lati". */
    fun invertSides(state: DirectorMapState): DirectorMapState = DirectorMapGeometry.invertCameraSide(state)

    private fun recomputeDerivedFields(state: DirectorMapState): DirectorMapState {
        val distance = DirectorMapGeometry.distanceNormalized(state.subjectPosition, state.cameraPosition)
        return state.copy(
            cameraDistanceMeters = DirectorMapGeometry.distanceMeters(distance),
            zoomPercent = DirectorMapGeometry.zoomPercentFor(distance, REFERENCE_NORMALIZED_DISTANCE),
            relativeView = DirectorMapGeometry.relativeView(state.subjectFacingDegrees, state.subjectPosition, state.cameraPosition),
        )
    }
}
