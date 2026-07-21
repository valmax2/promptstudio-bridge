package com.promptforge.pro.feature.directormap

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.DirectorMapGeometry
import com.promptforge.pro.coremodel.DirectorMapInteractions
import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coreui.PromptForgeColors
import com.promptforge.pro.coreui.PromptForgeGradients

/**
 * Vista laterale della Director Map: l'aggiunta chiesta esplicitamente per
 * rendere intuitiva anche l'altezza della camera (dal basso, altezza occhi,
 * dall'alto), che la sola vista dall'alto non può mostrare (§3 originale
 * prevedeva solo `cameraHeightDegrees` come numero astratto).
 *
 * Il soggetto è disegnato come sagoma fissa a sinistra (altezza occhi = centro
 * verticale del canvas). La camera si trascina liberamente: l'asse orizzontale
 * è la stessa distanza normalizzata condivisa con la vista dall'alto (quindi
 * trascinare qui avvicina/allontana la camera esattamente come farebbe lo
 * zoom), l'asse verticale è l'elevazione (`cameraHeightDegrees`).
 */
@Composable
fun LateralDirectorMap(
    state: DirectorMapState,
    onStateChange: (DirectorMapState) -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentState = rememberUpdatedState(state)
    val currentOnStateChange = rememberUpdatedState(onStateChange)
    val subjectColor = PromptForgeColors.Green
    val cameraColor = PromptForgeColors.Orange
    val groundColor = MaterialTheme.colorScheme.outline

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(160.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(PromptForgeGradients.StageBackground)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDrag = { change, _ ->
                        change.consume()
                        val distanceRatio = (change.position.x / size.width)
                            .coerceIn(DirectorMapGeometry.MIN_NORMALIZED_DISTANCE, DirectorMapGeometry.MAX_NORMALIZED_DISTANCE)
                        // y=0 in alto -> elevazione +1 (dall'alto); y=height in basso -> elevazione -1 (dal basso).
                        val elevationRatio = 1f - 2f * (change.position.y / size.height)

                        val zoomPercent = DirectorMapGeometry.zoomPercentFor(
                            distanceRatio,
                            DirectorMapInteractions.REFERENCE_NORMALIZED_DISTANCE,
                        )
                        val withDistance = DirectorMapInteractions.setZoomPercent(currentState.value, zoomPercent)
                        val withElevation = DirectorMapInteractions.setElevationRatio(withDistance, elevationRatio.coerceIn(-1f, 1f))
                        currentOnStateChange.value(withElevation)
                    },
                )
            },
    ) {
        val centerY = size.height / 2f
        val subjectX = size.width * 0.15f

        // linea "altezza occhi" (riferimento orizzontale)
        drawLine(
            color = groundColor,
            start = Offset(0f, centerY),
            end = Offset(size.width, centerY),
            strokeWidth = 1.dp.toPx(),
        )

        // sagoma soggetto: testa a centerY (con un piccolo alone), corpo verso il basso
        val headCenter = Offset(subjectX, centerY - 8.dp.toPx())
        drawCircle(brush = PromptForgeGradients.radialGlow(subjectColor), radius = 22.dp.toPx(), center = headCenter)
        drawCircle(color = subjectColor, radius = 8.dp.toPx(), center = headCenter)
        drawLine(
            color = subjectColor,
            start = Offset(subjectX, centerY),
            end = Offset(subjectX, centerY + 40.dp.toPx()),
            strokeWidth = 3.dp.toPx(),
        )

        val distanceRatio = DirectorMapGeometry.distanceNormalized(state.subjectPosition, state.cameraPosition)
            .coerceIn(DirectorMapGeometry.MIN_NORMALIZED_DISTANCE, DirectorMapGeometry.MAX_NORMALIZED_DISTANCE)
        val elevationRatio = DirectorMapGeometry.elevationRatioFromHeightDegrees(state.cameraHeightDegrees)
        val cameraX = distanceRatio * size.width
        val cameraY = centerY - elevationRatio * (centerY * 0.85f)

        drawLine(
            color = groundColor,
            start = Offset(subjectX, centerY),
            end = Offset(cameraX, cameraY),
            strokeWidth = 1.5.dp.toPx(),
        )
        val cameraCenter = Offset(cameraX, cameraY)
        drawCircle(brush = PromptForgeGradients.radialGlow(cameraColor), radius = 30.dp.toPx(), center = cameraCenter)
        drawCircle(color = cameraColor, radius = 11.dp.toPx(), center = cameraCenter)
        drawCircle(color = Color.White.copy(alpha = 0.85f), radius = 4.dp.toPx(), center = cameraCenter)
    }
}
