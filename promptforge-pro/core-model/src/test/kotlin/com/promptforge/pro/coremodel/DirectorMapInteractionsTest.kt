package com.promptforge.pro.coremodel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DirectorMapInteractionsTest {

    @Test
    fun `spostare la camera ricalcola distanza, zoom e vista relativa insieme`() {
        val state = DirectorMapState.Default

        val spostato = DirectorMapInteractions.moveCamera(state, rawX = 0.9f, rawY = 0.5f)

        assertEquals(OffsetRatio(0.9f, 0.5f), spostato.cameraPosition)
        assertNotEquals(state.cameraDistanceMeters, spostato.cameraDistanceMeters)
        assertNotEquals(state.zoomPercent, spostato.zoomPercent)
    }

    @Test
    fun `spostare la camera fuori dal canvas viene limitato al bordo`() {
        val spostato = DirectorMapInteractions.moveCamera(DirectorMapState.Default, rawX = 1.7f, rawY = -0.4f)

        assertEquals(1f, spostato.cameraPosition.x, 0.001f)
        assertEquals(0f, spostato.cameraPosition.y, 0.001f)
    }

    @Test
    fun `spostare il soggetto aggiorna anche la vista relativa`() {
        // soggetto spostato accanto alla camera, sullo stesso bearing verso cui guarda -> vista diversa da Default
        val spostato = DirectorMapInteractions.moveSubject(DirectorMapState.Default, rawX = 0.2f, rawY = 0.2f)

        assertEquals(OffsetRatio(0.2f, 0.2f), spostato.subjectPosition)
        // non deve esplodere né lasciare lo stato incoerente: la vista deve comunque essere quella
        // ricalcolata dalla geometria per la nuova posizione, non quella (stale) di Default.
        val vistaAttesa = DirectorMapGeometry.relativeView(spostato.subjectFacingDegrees, spostato.subjectPosition, spostato.cameraPosition)
        assertEquals(vistaAttesa, spostato.relativeView)
    }

    @Test
    fun `impostare lo zoom al 200 percento avvicina la camera al soggetto`() {
        val zoomato = DirectorMapInteractions.setZoomPercent(DirectorMapState.Default, zoomPercent = 200)

        assertEquals(200, zoomato.zoomPercent)
        assertTrue(
            "a zoom maggiore la distanza deve diminuire",
            DirectorMapGeometry.distanceNormalized(zoomato.subjectPosition, zoomato.cameraPosition) <
                DirectorMapGeometry.distanceNormalized(DirectorMapState.Default.subjectPosition, DirectorMapState.Default.cameraPosition),
        )
    }

    @Test
    fun `lo zoom mantiene lo stesso bearing della camera`() {
        val prima = DirectorMapGeometry.bearingDegrees(DirectorMapState.Default.subjectPosition, DirectorMapState.Default.cameraPosition)

        val zoomato = DirectorMapInteractions.setZoomPercent(DirectorMapState.Default, zoomPercent = 250)

        val dopo = DirectorMapGeometry.bearingDegrees(zoomato.subjectPosition, zoomato.cameraPosition)
        assertEquals(prima, dopo, 0.1f)
    }

    @Test
    fun `la vista laterale converte l'elevazione trascinata in gradi camera`() {
        val alzata = DirectorMapInteractions.setElevationRatio(DirectorMapState.Default, elevationRatio = 0.5f)

        assertEquals(45f, alzata.cameraHeightDegrees, 0.01f)
    }

    @Test
    fun `lo spostamento verticale non tocca la posizione nella vista dall'alto`() {
        val originale = DirectorMapState.Default

        val alzata = DirectorMapInteractions.setElevationRatio(originale, elevationRatio = -0.8f)

        assertEquals(originale.subjectPosition, alzata.subjectPosition)
        assertEquals(originale.cameraPosition, alzata.cameraPosition)
        assertEquals(originale.zoomPercent, alzata.zoomPercent)
    }

    @Test
    fun `reset torna esattamente allo stato di default`() {
        val modificato = DirectorMapInteractions.setZoomPercent(
            DirectorMapInteractions.moveCamera(DirectorMapState.Default, 0.1f, 0.9f),
            zoomPercent = 300,
        )

        val resettato = DirectorMapInteractions.reset()

        assertEquals(DirectorMapState.Default, resettato)
        assertNotEquals(DirectorMapState.Default, modificato)
    }

    @Test
    fun `invertSides delega alla geometria e mantiene la distanza`() {
        val state = DirectorMapState.Default.copy(cameraPosition = OffsetRatio(0.75f, 0.4f))

        val invertito = DirectorMapInteractions.invertSides(state)

        assertEquals(
            DirectorMapGeometry.distanceNormalized(state.subjectPosition, state.cameraPosition),
            DirectorMapGeometry.distanceNormalized(invertito.subjectPosition, invertito.cameraPosition),
            0.01f,
        )
    }

    @Test
    fun `ruotare il soggetto con setSubjectFacing aggiorna la vista relativa`() {
        val state = DirectorMapState.Default // Front, subject facing 180, camera a sud

        val ruotato = DirectorMapInteractions.setSubjectFacing(state, facingDegrees = 0f)

        assertEquals(RelativeSubjectView.Back, ruotato.relativeView)
    }
}
