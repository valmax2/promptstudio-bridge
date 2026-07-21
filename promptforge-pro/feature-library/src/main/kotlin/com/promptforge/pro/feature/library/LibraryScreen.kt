package com.promptforge.pro.feature.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.promptforge.pro.coremodel.LibraryItem

@Composable
fun LibraryScreen(viewModel: LibraryViewModel = hiltViewModel()) {
    val items by viewModel.items.collectAsState()

    if (items.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Nessun prompt salvato ancora — generane uno dal Builder", style = MaterialTheme.typography.bodyMedium)
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(items, key = LibraryItem::id) { item ->
            LibraryItemCard(
                item = item,
                onToggleFavorite = { viewModel.toggleFavorite(item) },
                onDelete = { viewModel.delete(item) },
            )
        }
    }
}

@Composable
private fun LibraryItemCard(item: LibraryItem, onToggleFavorite: () -> Unit, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                item.draft.italianText.ifBlank { item.draft.englishText },
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                "${item.generatedPrompts.size} varianti generate",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onToggleFavorite) {
                    Text(if (item.favorite) "★ Preferito" else "☆ Aggiungi ai preferiti")
                }
                TextButton(onClick = onDelete) {
                    Text("Elimina")
                }
            }
        }
    }
}
