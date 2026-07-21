package com.promptforge.pro.feature.builder

import com.promptforge.pro.promptengine.DefaultPromptEngine
import com.promptforge.pro.promptengine.PromptEngine
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * `prompt-engine` è deliberatamente un modulo Kotlin puro senza alcuna
 * dipendenza da Hilt/Android (§1, §7) — il binding verso Hilt vive qui,
 * nell'unico modulo che lo consuma, non nel motore stesso.
 */
@Module
@InstallIn(SingletonComponent::class)
object PromptEngineModule {

    @Provides
    @Singleton
    fun providePromptEngine(): PromptEngine = DefaultPromptEngine()
}
