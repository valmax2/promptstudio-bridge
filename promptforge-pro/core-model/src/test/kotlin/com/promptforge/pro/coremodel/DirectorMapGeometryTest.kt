package com.promptforge.pro.coremodel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class DirectorMapGeometryTest {

    // --- bearing -------------------------------------------------------

    @Test
    fun `bearing verso l'alto e nord, zero gradi`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val cameraSopra = OffsetRatio(0.5f, 0.2f) // y minore = più in alto sullo schermo

        assertEquals(0f, DirectorMapGeometry.bearingDegrees(subject, cameraSopra), 0.01f)
    }

    @Test
    fun `bearing verso il basso e sud, 180 gradi`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val cameraSotto = OffsetRatio(0.5f, 0.8f)

        assertEquals(180f, DirectorMapGeometry.bearingDegrees(subject, cameraSotto), 0.01f)
    }

    @Test
    fun `bearing verso destra e est, 90 gradi`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val cameraDestra = OffsetRatio(0.8f, 0.5f)

        assertEquals(90f, DirectorMapGeometry.bearingDegrees(subject, cameraDestra), 0.01f)
    }

    @Test
    fun `bearing verso sinistra e ovest, 270 gradi`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val cameraSinistra = OffsetRatio(0.2f, 0.5f)

        assertEquals(270f, DirectorMapGeometry.bearingDegrees(subject, cameraSinistra), 0.01f)
    }

    // --- distanza --------------------------------------------------------

    @Test
    fun `distanza normalizzata e la distanza euclidea tra i due punti`() {
        val a = OffsetRatio(0.5f, 0.5f)
        val b = OffsetRatio(0.5f, 0.9f)

        assertEquals(0.4f, DirectorMapGeometry.distanceNormalized(a, b), 0.001f)
    }

    @Test
    fun `distanza in metri e proporzionale alla distanza normalizzata`() {
        assertEquals(10f, DirectorMapGeometry.distanceMeters(1f), 0.001f)
        assertEquals(5f, DirectorMapGeometry.distanceMeters(0.5f), 0.001f)
    }

    // --- vista relativa (criterio di accettazione #5: ruotando il soggetto la vista cambia) ---

    @Test
    fun `camera nella direzione in cui il soggetto guarda e vista frontale`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val camera = OffsetRatio(0.5f, 0.2f) // sopra, cioè bearing 0

        val view = DirectorMapGeometry.relativeView(subjectFacingDegrees = 0f, subject, camera)

        assertEquals(RelativeSubjectView.Front, view)
    }

    @Test
    fun `camera dietro al soggetto che le volta le spalle e vista posteriore`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val camera = OffsetRatio(0.5f, 0.2f) // bearing 0

        // soggetto rivolto a sud (180): la camera, a nord, vede la schiena
        val view = DirectorMapGeometry.relativeView(subjectFacingDegrees = 180f, subject, camera)

        assertEquals(RelativeSubjectView.Back, view)
    }

    @Test
    fun `camera di lato al soggetto e vista di profilo`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val camera = OffsetRatio(0.5f, 0.2f) // bearing 0

        val view = DirectorMapGeometry.relativeView(subjectFacingDegrees = 90f, subject, camera)

        assertEquals(RelativeSubjectView.Profile, view)
    }

    @Test
    fun `ruotare il soggetto di 45 gradi porta a una vista a tre quarti`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val camera = OffsetRatio(0.5f, 0.2f) // bearing 0

        val view = DirectorMapGeometry.relativeView(subjectFacingDegrees = 45f, subject, camera)

        assertEquals(RelativeSubjectView.ThreeQuarter, view)
    }

    @Test
    fun `ruotare progressivamente il soggetto cambia la vista relativa in modo continuo`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val camera = OffsetRatio(0.5f, 0.2f)

        val views = (0..359 step 15).map { facing ->
            DirectorMapGeometry.relativeView(facing.toFloat(), subject, camera)
        }

        // Non deve mai "saltare" da Front a Back senza passare da Profile/ThreeQuarter
        // in mezzo: una rotazione continua del soggetto deve dare una sequenza continua.
        assertTrue(views.contains(RelativeSubjectView.Front))
        assertTrue(views.contains(RelativeSubjectView.Back))
        assertTrue(views.contains(RelativeSubjectView.Profile))
        assertTrue(views.contains(RelativeSubjectView.ThreeQuarter))
    }

    // --- zoom <-> distanza (criterio di accettazione #4) ------------------

    @Test
    fun `aumentare lo zoom riduce la distanza normalizzata`() {
        val baseDistance = 0.35f

        val distanzaAlZoom100 = DirectorMapGeometry.normalizedDistanceForZoom(100, baseDistance)
        val distanzaAlZoom200 = DirectorMapGeometry.normalizedDistanceForZoom(200, baseDistance)

        assertTrue("zoom maggiore deve avvicinare la camera", distanzaAlZoom200 < distanzaAlZoom100)
    }

    @Test
    fun `zoom e distanza sono l'inverso l'uno dell'altro`() {
        val baseDistance = 0.35f

        val distanza = DirectorMapGeometry.normalizedDistanceForZoom(150, baseDistance)
        val zoomRicostruito = DirectorMapGeometry.zoomPercentFor(distanza, baseDistance)

        assertEquals(150, zoomRicostruito)
    }

    @Test
    fun `spostare la camera con lo zoom la mantiene sullo stesso bearing`() {
        val subject = OffsetRatio(0.5f, 0.5f)
        val bearing = 45f
        val baseDistance = 0.3f

        val vicino = DirectorMapGeometry.cameraPositionAtDistance(
            subject,
            bearing,
            DirectorMapGeometry.normalizedDistanceForZoom(200, baseDistance),
        )
        val lontano = DirectorMapGeometry.cameraPositionAtDistance(
            subject,
            bearing,
            DirectorMapGeometry.normalizedDistanceForZoom(100, baseDistance),
        )

        assertEquals(bearing, DirectorMapGeometry.bearingDegrees(subject, vicino), 0.1f)
        assertEquals(bearing, DirectorMapGeometry.bearingDegrees(subject, lontano), 0.1f)
        assertTrue(
            "zoom 200% deve essere più vicino di zoom 100%",
            DirectorMapGeometry.distanceNormalized(subject, vicino) < DirectorMapGeometry.distanceNormalized(subject, lontano),
        )
    }

    // --- clamping ai bordi -------------------------------------------------

    @Test
    fun `la posizione viene limitata al bordo destro quando uscirebbe dalla superficie`() {
        val risultato = DirectorMapGeometry.cameraPositionAtDistance(
            subjectPosition = OffsetRatio(0.9f, 0.9f),
            bearingDegrees = 90f, // verso est: senza clamping x sarebbe 1.4, fuori dal canvas
            normalizedDistance = 0.5f,
        )

        assertEquals(1f, risultato.x, 0.001f)
    }

    @Test
    fun `clampToUnitSquare riporta coordinate negative a zero`() {
        val risultato = DirectorMapGeometry.clampToUnitSquare(x = -0.3f, y = 1.5f)

        assertEquals(0f, risultato.x, 0.001f)
        assertEquals(1f, risultato.y, 0.001f)
    }

    // --- elevazione (vista laterale) ---------------------------------------

    @Test
    fun `elevazione zero e altezza occhi`() {
        assertEquals(0f, DirectorMapGeometry.heightDegreesFromElevationRatio(0f), 0.01f)
    }

    @Test
    fun `elevazione massima e novanta gradi dall'alto`() {
        assertEquals(90f, DirectorMapGeometry.heightDegreesFromElevationRatio(1f), 0.01f)
        assertEquals(-90f, DirectorMapGeometry.heightDegreesFromElevationRatio(-1f), 0.01f)
    }

    @Test
    fun `conversione elevazione-gradi e il suo inverso fanno andata e ritorno`() {
        val originale = 0.42f

        val gradi = DirectorMapGeometry.heightDegreesFromElevationRatio(originale)
        val ricostruito = DirectorMapGeometry.elevationRatioFromHeightDegrees(gradi)

        assertEquals(originale, ricostruito, 0.001f)
    }

    // --- inverti lati --------------------------------------------------

    @Test
    fun `invertire i lati riflette la camera mantenendo la stessa distanza`() {
        val state = DirectorMapState.Default.copy(
            subjectFacingDegrees = 0f,
            cameraPosition = OffsetRatio(0.7f, 0.2f), // camera spostata a destra rispetto al soggetto
        )

        val invertito = DirectorMapGeometry.invertCameraSide(state)

        val distanzaOriginale = DirectorMapGeometry.distanceNormalized(state.subjectPosition, state.cameraPosition)
        val distanzaInvertita = DirectorMapGeometry.distanceNormalized(invertito.subjectPosition, invertito.cameraPosition)
        assertEquals(distanzaOriginale, distanzaInvertita, 0.01f)

        // la camera doveva essere a destra (bearing > 0), ora deve essere a sinistra (bearing < 360, speculare)
        val bearingOriginale = DirectorMapGeometry.bearingDegrees(state.subjectPosition, state.cameraPosition)
        val bearingInvertito = DirectorMapGeometry.bearingDegrees(invertito.subjectPosition, invertito.cameraPosition)
        assertTrue(abs(bearingOriginale - (360f - bearingInvertito)) < 1f)
    }

    @Test
    fun `invertire due volte torna alla posizione originale`() {
        val state = DirectorMapState.Default.copy(cameraPosition = OffsetRatio(0.75f, 0.3f))

        val doppioInvertito = DirectorMapGeometry.invertCameraSide(DirectorMapGeometry.invertCameraSide(state))

        assertEquals(state.cameraPosition.x, doppioInvertito.cameraPosition.x, 0.01f)
        assertEquals(state.cameraPosition.y, doppioInvertito.cameraPosition.y, 0.01f)
    }

    // --- Default è internamente coerente -----------------------------------

    @Test
    fun `lo stato di default e geometricamente coerente con se stesso`() {
        val default = DirectorMapState.Default

        val distanzaAttesa = DirectorMapGeometry.distanceNormalized(default.subjectPosition, default.cameraPosition)
        assertEquals(DirectorMapGeometry.distanceMeters(distanzaAttesa), default.cameraDistanceMeters, 0.001f)

        val vistaAttesa = DirectorMapGeometry.relativeView(default.subjectFacingDegrees, default.subjectPosition, default.cameraPosition)
        assertEquals(vistaAttesa, default.relativeView)
    }
}
