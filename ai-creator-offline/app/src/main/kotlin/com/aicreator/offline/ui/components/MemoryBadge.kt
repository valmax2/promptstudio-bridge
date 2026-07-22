package com.aicreator.offline.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun MemoryEstimateBadge(availableRamMb: Int, requiredRamMb: Int, modifier: Modifier = Modifier) {
    val sufficient = availableRamMb >= requiredRamMb
    val containerColor = if (sufficient) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer
    val contentColor = if (sufficient) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer

    Surface(shape = RoundedCornerShape(12.dp), color = containerColor, modifier = modifier) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (sufficient) Icons.Filled.CheckCircle else Icons.Filled.Warning,
                contentDescription = null,
                tint = contentColor,
            )
            Text(
                text = if (sufficient) {
                    "Memoria stimata sufficiente: $requiredRamMb MB richiesti, $availableRamMb MB liberi"
                } else {
                    "Memoria insufficiente: servono ~$requiredRamMb MB, ne sono liberi $availableRamMb MB"
                },
                color = contentColor,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}
