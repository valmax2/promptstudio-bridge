package com.promptforge.pro.translation

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * §4: solo il dizionario di emergenza è implementato oggi (vedi
 * [DictionaryFallbackTranslationEngine]) — le implementazioni migliori
 * (on-device ML Kit, LibreTranslate locale, Ollama locale) sono da fare in
 * una fase futura. Cambiarle in seguito significa toccare solo questo
 * binding, non i chiamanti: è esattamente perché §4 chiede un'interfaccia.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class TranslationModule {

    @Binds
    @Singleton
    abstract fun bindTranslationEngine(impl: DictionaryFallbackTranslationEngine): TranslationEngine
}
