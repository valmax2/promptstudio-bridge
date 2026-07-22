package com.aicreator.offline.util

import android.util.Log
import com.aicreator.offline.BuildConfig

/**
 * Unico punto da cui l'app dovrebbe loggare. Accetta solo messaggi statici o
 * privi di contenuto utente (nessun prompt, nessun percorso di foto, nessun
 * dato personale) — la firma stessa non accetta un [Throwable] con messaggio
 * arbitrario senza che il chiamante lo dichiari esplicitamente innocuo.
 * In build release i log verbose/debug sono comunque disattivati.
 */
object PrivacyLogger {

    fun d(tag: String, message: String) {
        if (BuildConfig.DEBUG) Log.d(tag, message)
    }

    fun w(tag: String, message: String) {
        Log.w(tag, message)
    }

    fun e(tag: String, message: String, technicalDetail: String? = null) {
        Log.e(tag, if (technicalDetail != null) "$message ($technicalDetail)" else message)
    }
}
