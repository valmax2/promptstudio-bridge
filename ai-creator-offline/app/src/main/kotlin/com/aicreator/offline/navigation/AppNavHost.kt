package com.aicreator.offline.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aicreator.offline.AppContainer
import com.aicreator.offline.ui.screens.character.CharacterScreen
import com.aicreator.offline.ui.screens.diagnostics.DiagnosticsScreen
import com.aicreator.offline.ui.screens.face.FaceModeScreen
import com.aicreator.offline.ui.screens.fullbody.FullBodyModeScreen
import com.aicreator.offline.ui.screens.gallery.GalleryScreen
import com.aicreator.offline.ui.screens.generate.GenerateScreen
import com.aicreator.offline.ui.screens.history.HistoryScreen
import com.aicreator.offline.ui.screens.home.HomeScreen
import com.aicreator.offline.ui.screens.lock.LockScreen
import com.aicreator.offline.ui.screens.lora.LoraScreen
import com.aicreator.offline.ui.screens.models.ModelsScreen
import com.aicreator.offline.ui.screens.presets.PresetsScreen
import com.aicreator.offline.ui.screens.settings.SettingsScreen

private val bottomBarDestinations = listOf(
    AppDestination.HOME,
    AppDestination.GENERATE,
    AppDestination.CHARACTER,
    AppDestination.MODELS,
    AppDestination.GALLERY,
)

@Composable
fun AppNavHost(container: AppContainer, activity: FragmentActivity, appLockEnabled: Boolean) {
    var isUnlocked by remember(appLockEnabled) { mutableStateOf(!appLockEnabled) }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner, appLockEnabled) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP && appLockEnabled) {
                isUnlocked = false
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (!isUnlocked) {
        LockScreen(activity = activity, onUnlocked = { isUnlocked = true })
        return
    }

    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination?.route
            NavigationBar {
                bottomBarDestinations.forEach { destination ->
                    NavigationBarItem(
                        selected = currentRoute == destination.route,
                        onClick = {
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(destination.icon, contentDescription = destination.label) },
                        label = { Text(destination.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = AppDestination.HOME.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(AppDestination.HOME.route) {
                HomeScreen(container = container, onNavigate = { navController.navigate(it) })
            }
            composable(AppDestination.GENERATE.route) {
                GenerateScreen(container = container)
            }
            composable(AppDestination.CHARACTER.route) {
                CharacterScreen(container = container, onNavigate = { navController.navigate(it) })
            }
            composable(AppDestination.FACE.route) {
                FaceModeScreen(container = container, onDone = { navController.navigate(AppDestination.GENERATE.route) })
            }
            composable(AppDestination.FULL_BODY.route) {
                FullBodyModeScreen(container = container, onDone = { navController.navigate(AppDestination.GENERATE.route) })
            }
            composable(AppDestination.MODELS.route) {
                ModelsScreen(container = container)
            }
            composable(AppDestination.LORA.route) {
                LoraScreen(container = container)
            }
            composable(AppDestination.PRESETS.route) {
                PresetsScreen(container = container)
            }
            composable(AppDestination.HISTORY.route) {
                HistoryScreen(container = container)
            }
            composable(AppDestination.GALLERY.route) {
                GalleryScreen(container = container)
            }
            composable(AppDestination.DIAGNOSTICS.route) {
                DiagnosticsScreen(container = container)
            }
            composable(AppDestination.SETTINGS.route) {
                SettingsScreen(container = container)
            }
        }
    }
}
