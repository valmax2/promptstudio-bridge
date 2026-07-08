package com.vstudio.bthidkeyboard

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.widget.doAfterTextChanged
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var hidController: BluetoothHidController
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var statusText: TextView
    private var isVoiceListening = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        checkPermissions()

        statusText = findViewById(R.id.statusText)
        val inputEditText = findViewById<EditText>(R.id.inputEditText)
        val btnVoice = findViewById<Button>(R.id.btnVoice)

        hidController = BluetoothHidController(this) { message ->
            runOnUiThread { statusText.text = message }
        }

        inputEditText.doAfterTextChanged { editable ->
            val text = editable?.toString() ?: ""
            if (text.isNotEmpty()) {
                val lastChar = text.last()
                hidController.sendChar(lastChar)
                editable?.clear()
            }
        }

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        val speechIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.ITALIAN.toString())
        }

        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val textDettato = matches[0]
                    hidController.sendString("$textDettato ")
                }
                resetVoiceButton(btnVoice)
            }

            override fun onReadyForSpeech(params: Bundle?) { statusText.text = "Ascoltando la tua voce..." }
            override fun onError(error: Int) {
                statusText.text = "Errore vocale o nessun suono rilevato."
                resetVoiceButton(btnVoice)
            }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        btnVoice.setOnClickListener {
            if (!isVoiceListening) {
                isVoiceListening = true
                btnVoice.text = "STOP DETTATURA"
                speechRecognizer.startListening(speechIntent)
            } else {
                resetVoiceButton(btnVoice)
                speechRecognizer.stopListening()
            }
        }
    }

    private fun resetVoiceButton(button: Button) {
        isVoiceListening = false
        button.text = "AVVIA DETTATURA VOCALE"
        statusText.text = "Pronto"
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
        }
        if (permissions.any { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 101)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer.destroy()
    }
}
