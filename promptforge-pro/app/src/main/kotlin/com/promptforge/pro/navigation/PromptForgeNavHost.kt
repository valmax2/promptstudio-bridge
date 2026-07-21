package com.promptforge.pro.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

/**
 * Scaffold di navigazione con le 4 destinazioni principali. Ogni schermata è per
 * ora un placeholder: le implementazioni reali (feature-builder, feature-library,
 * feature-presets, feature-settings) arrivano nelle fasi successive del roadmap
 * (vedi promptforge-pro/README.md).
 */
@Composable
fun PromptForgeApp(navController: NavHostController = rememberNavController()) {
    Scaffold(
        bottomBar = { PromptForgeBottomBar(navController) },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = PromptForgeDestination.Builder.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            PromptForgeDestination.entries.forEach { destination ->
                composable(destination.route) {
                    PlaceholderScreen(destination)
                }
            }
        }
    }
}

@Composable
private fun PromptForgeBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    NavigationBar {
        PromptForgeDestination.entries.forEach { destination ->
            NavigationBarItem(
                selected = currentRoute == destination.route,
                onClick = {
                    navController.navigate(destination.route) {
                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { PlaceholderIcon() },
                label = { Text(destination.label) },
            )
        }
    }
}

// Segnaposto minimo per l'icona della tab: le icone reali per Builder/Libreria/
// Preset/Impostazioni arrivano con l'implementazione di ciascuna feature.
@Composable
private fun PlaceholderIcon() {
    Box(
        modifier = Modifier
            .size(8.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.onSurfaceVariant),
    )
}

@Composable
private fun PlaceholderScreen(destination: PromptForgeDestination) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = "${destination.label} — in arrivo nelle prossime fasi",
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
