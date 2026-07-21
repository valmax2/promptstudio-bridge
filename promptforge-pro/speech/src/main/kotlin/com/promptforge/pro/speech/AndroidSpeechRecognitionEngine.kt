package com.promptforge.pro.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * §5: dettatura vocale con il riconoscimento di sistema (`RECORD_AUDIO`
 * richiesto solo quando l'utente preme il microfono — il permesso lo chiede
 * la UI, non questa classe). Lingua predefinita `it-IT` come richiesto.
 */
@Singleton
class AndroidSpeechRecognitionEngine @Inject constructor(
    @ApplicationContext private val context: Context,
) : SpeechRecognitionEngine {

    private val _state = MutableStateFlow<SpeechState>(SpeechState.Idle)
    override val state: StateFlow<SpeechState> = _state.asStateFlow()

    private var recognizer: SpeechRecognizer? = null

    override fun startListening(onResult: (String) -> Unit) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _state.value = SpeechState.Error("Riconoscimento vocale non disponibile su questo dispositivo")
            return
        }

        stopListening()

        val newRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = newRecognizer
        newRecognizer.setRecognitionListener(
            object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    _state.value = SpeechState.Listening
                }

                override fun onBeginningOfSpeech() = Unit
                override fun onRmsChanged(rmsdB: Float) = Unit
                override fun onBufferReceived(buffer: ByteArray?) = Unit

                override fun onEndOfSpeech() {
                    _state.value = SpeechState.Processing
                }

                override fun onError(error: Int) {
                    _state.value = SpeechState.Error(describeError(error))
                    release()
                }

                override fun onResults(results: Bundle?) {
                    val text = results
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()
                    _state.value = SpeechState.Idle
                    release()
                    if (!text.isNullOrBlank()) onResult(text)
                }

                override fun onPartialResults(partialResults: Bundle?) = Unit
                override fun onEvent(eventType: Int, params: Bundle?) = Unit
            },
        )

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT")
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        }
        newRecognizer.startListening(intent)
    }

    override fun stopListening() {
        recognizer?.stopListening()
        release()
    }

    private fun release() {
        recognizer?.destroy()
        recognizer = null
    }

    private fun describeError(error: Int): String = when (error) {
        SpeechRecognizer.ERROR_NO_MATCH -> "Non ho capito, riprova"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Nessun audio rilevato"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Permesso microfono negato"
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Problema di rete col riconoscimento vocale"
        SpeechRecognizer.ERROR_AUDIO -> "Errore del microfono"
        else -> "Errore nel riconoscimento vocale"
    }
}
