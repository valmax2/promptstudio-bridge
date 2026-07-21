package com.promptforge.pro.translation

/**
 * §4: interfaccia astratta, implementazioni sostituibili (on-device, dizionario
 * di emergenza, LibreTranslate locale, Ollama locale). Solo il dizionario di
 * emergenza è implementato in questa fase — vedi [DictionaryFallbackTranslationEngine].
 */
interface TranslationEngine {
    suspend fun translateItalianToEnglish(text: String): TranslationResult
}

sealed interface TranslationResult {
    data class Success(val englishText: String, val isApproximate: Boolean) : TranslationResult
    data class Failure(val reason: String) : TranslationResult
}
