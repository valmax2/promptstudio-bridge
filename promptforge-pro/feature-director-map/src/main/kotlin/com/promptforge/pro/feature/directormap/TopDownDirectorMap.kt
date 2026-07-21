package com.promptforge.pro.feature.directormap

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.promptforge.pro.coremodel.DirectorMapInteractions
import com.promptforge.pro.coremodel.DirectorMapState
import com.promptforge.pro.coreui.PromptForgeColors
import com.promptforge.pro.coreui.PromptForgeGradients
import kotlin.math.cos
import kotlin.math.sin

/** Raggio del bagliore attorno ai nodi, in dp: il "palco" prende luce da loro. */
private const val GLOW_RADIUS_DP = 34
private const val NODE_RADIUS_DP = 11

/** Raggio minimo di tocco per afferrare un nodo, in dp (area tattile accessibile). */
private const val HIT_RADIUS_DP = 28

/**
 * Vista dall'alto della Director Map (§3): orbita e distanza. Gestisce il
 * trascinamento indipendente di soggetto (verde) e camera (arancione).
 *
 * Il tocco trascina un nodo **solo se inizia vicino a quel nodo** (raggio
 * [HIT_RADIUS_DP]): un tocco altrove sul canvas non viene consumato, così lo
 * scroll della pagina che lo contiene continua a funzionare normalmente. La
 * versione precedente trascinava sempre il nodo più vicino ovunque si
 * toccasse, anche a schermate intere di distanza — bug reale, segnalato
 * dall'utente ("dove metti il dito rimane bloccata lì").
 *
 * Tutta la matematica (bearing, distanza, vista relativa, clamping ai bordi)
 * vive in [DirectorMapInteractions]/`core-model` — qui c'è solo disegno e
 * gesture, per questo è testata lì e non qui (vedi promptforge-pro/README.md
 * sul perché i moduli Android in questa sessione non erano compilabili).
 */
@Composable
fun TopDownDirectorMap(
    state: DirectorMapState,
    onStateChange: (DirectorMapState) -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentState = rememberUpdatedState(state)
    val currentOnStateChange = rememberUpdatedState(onStateChange)
    val subjectColor = PromptForgeColors.Green
    val cameraColor = PromptForgeColors.Orange
    val lineColor = MaterialTheme.colorScheme.outline
    val hitRadiusPx = with(LocalDensity.current) { HIT_RADIUS_DP.dp.toPx() }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clip(RoundedCornerShape(20.dp))
            .background(PromptForgeGradients.StageBackground)
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val s = currentState.value
                    val subjectPx = Offset(s.subjectPosition.x * size.width, s.subjectPosition.y * size.height)
                    val cameraPx = Offset(s.cameraPosition.x * size.width, s.cameraPosition.y * size.height)
                    val distanceToSubject = (down.position - subjectPx).getDistance()
                    val distanceToCamera = (down.position - cameraPx).getDistance()

                    if (distanceToSubject > hitRadiusPx && distanceToCamera > hitRadiusPx) {
                        // Tocco lontano da entrambi i nodi: non consumiamo nulla,
                        // il genitore (scroll della pagina) gestisce il gesto.
                        return@awaitEachGesture
                    }

                    val draggingSubject = distanceToSubject <= distanceToCamera
                    down.consume()
                    drag(down.id) { change ->
                        change.consume()
                        val ratioX = change.position.x / size.width
                        val ratioY = change.position.y / size.height
                        val next = if (draggingSubject) {
                            DirectorMapInteractions.moveSubject(currentState.value, ratioX, ratioY)
                        } else {
                            DirectorMapInteractions.moveCamera(currentState.value, ratioX, ratioY)
                        }
                        currentOnStateChange.value(next)
                    }
                }
            },
    ) {
        val subjectPx = Offset(state.subjectPosition.x * size.width, state.subjectPosition.y * size.height)
        val cameraPx = Offset(state.cameraPosition.x * size.width, state.cameraPosition.y * size.height)

        drawLine(
            color = lineColor,
            start = subjectPx,
            end = cameraPx,
            strokeWidth = 2.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 10f)),
        )

        drawCameraCone(from = cameraPx, towards = subjectPx, color = cameraColor)
        drawFacingArrow(at = subjectPx, facingDegrees = state.subjectFacingDegrees, color = subjectColor)

        drawNodeWithGlow(center = cameraPx, color = cameraColor)
        drawNodeWithGlow(center = subjectPx, color = subjectColor)
    }
}

/** Nodo "luminoso": alone radiale soffuso dietro un cerchio pieno, come una fonte di luce sul set. */
private fun DrawScope.drawNodeWithGlow(center: Offset, color: Color) {
    drawCircle(brush = PromptForgeGradients.radialGlow(color), radius = GLOW_RADIUS_DP.dp.toPx(), center = center)
    drawCircle(color = color, radius = NODE_RADIUS_DP.dp.toPx(), center = center)
    drawCircle(color = Color.White.copy(alpha = 0.85f), radius = (NODE_RADIUS_DP * 0.35f).dp.toPx(), center = center)
}

/** Cono visivo semplificato: due segmenti dalla camera che si allargano verso il soggetto. */
private fun DrawScope.drawCameraCone(from: Offset, towards: Offset, color: Color) {
    val direction = towards - from
    val length = direction.getDistance()
    if (length < 1f) return
    val unit = Offset(direction.x / length, direction.y / length)
    val perpendicular = Offset(-unit.y, unit.x)
    val spread = length * 0.28f

    val left = towards + perpendicular * spread
    val right = towards - perpendicular * spread

    drawLine(color = color.copy(alpha = 0.35f), start = from, end = left, strokeWidth = 1.5.dp.toPx())
    drawLine(color = color.copy(alpha = 0.35f), start = from, end = right, strokeWidth = 1.5.dp.toPx())
}

/** Freccia che indica `subjectFacingDegrees` (0°=nord/verso l'alto, in senso orario). */
private fun DrawScope.drawFacingArrow(at: Offset, facingDegrees: Float, color: Color) {
    val radians = Math.toRadians(facingDegrees.toDouble())
    val length = 26.dp.toPx()
    val tip = at + Offset((sin(radians) * length).toFloat(), -(cos(radians) * length).toFloat())

    drawLine(color = color, start = at, end = tip, strokeWidth = 3.dp.toPx())

    val headLength = 8.dp.toPx()
    val headAngle = Math.toRadians(25.0)
    val backAngle = radians + Math.PI
    val left = tip + Offset(
        (sin(backAngle + headAngle) * headLength).toFloat(),
        -(cos(backAngle + headAngle) * headLength).toFloat(),
    )
    val right = tip + Offset(
        (sin(backAngle - headAngle) * headLength).toFloat(),
        -(cos(backAngle - headAngle) * headLength).toFloat(),
    )
    drawLine(color = color, start = tip, end = left, strokeWidth = 3.dp.toPx())
    drawLine(color = color, start = tip, end = right, strokeWidth = 3.dp.toPx())
}
