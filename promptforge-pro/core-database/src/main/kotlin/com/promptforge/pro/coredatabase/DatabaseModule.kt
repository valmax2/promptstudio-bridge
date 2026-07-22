package com.promptforge.pro.coredatabase

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PromptForgeDatabase =
        Room.databaseBuilder(context, PromptForgeDatabase::class.java, PromptForgeDatabase.FILE_NAME)
            .addMigrations(MIGRATION_1_2)
            .build()

    @Provides
    fun provideLibraryDao(database: PromptForgeDatabase): LibraryDao = database.libraryDao()

    @Provides
    fun providePresetDao(database: PromptForgeDatabase): PresetDao = database.presetDao()

    @Provides
    fun provideCharacterDao(database: PromptForgeDatabase): CharacterDao = database.characterDao()

    @Provides
    @Singleton
    fun provideLibraryRepository(dao: LibraryDao): LibraryRepository = RoomLibraryRepository(dao)

    @Provides
    @Singleton
    fun providePresetRepository(dao: PresetDao): PresetRepository = RoomPresetRepository(dao)

    @Provides
    @Singleton
    fun provideCharacterRepository(dao: CharacterDao): CharacterRepository = RoomCharacterRepository(dao)
}
