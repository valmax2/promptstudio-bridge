package com.aicreator.offline

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Test strumentale minimo: verifica che l'app si avvii e mostri la Home.
 * Richiede un dispositivo/emulatore reale (Room+SQLCipher e MediaPipe usano
 * librerie native): non eseguibile in questo ambiente di generazione del
 * codice, vedi docs/TODO.md punto 8.
 */
@RunWith(AndroidJUnit4::class)
class MainActivityNavigationTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun homeScreenIsDisplayedOnLaunch() {
        composeTestRule.onNodeWithText("AI Creator Offline").assertExists()
    }
}
