package com.promptforge.pro.speech

import kotlinx.coroutines.flow.StateFlow

/**
 * §5: interfaccia sostituibile — l'implementazione di sistema
 * ([AndroidSpeechRecognitionEngine]) usa il riconoscimento vocale Android;
 * un futuro motore Whisper locale implementerebbe la stessa interfaccia
 * senza toccare chi la chiama (feature-builder).
 */
interface SpeechRecognitionEngine {
    val state: StateFlow<SpeechState>

    /** `onResult` riceve il testo finale riconosciuto quando l'utente smette di parlare. */
    fun startListening(onResult: (String) -> Unit)

    fun stopListening()
}

sealed interface SpeechState {
    data object Idle : SpeechState
    data object Listening : SpeechState
    data object Processing : SpeechState
    data class Error(val message: String) : SpeechState
}
