package com.promptforge.pro.coredatabase

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Ogni cambio di schema richiede una `Migration` esplicita — niente
 * `fallbackToDestructiveMigration`, la libreria dell'utente non è usa-e-getta
 * (§10: "tutti i modelli persistiti devono essere versionati per consentire
 * migrazioni future"). v2 aggiunge `character_profiles`, vedi [MIGRATION_1_2].
 */
@Database(
    entities = [LibraryItemEntity::class, PromptPresetEntity::class, CharacterProfileEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class PromptForgeDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao
    abstract fun presetDao(): PresetDao
    abstract fun characterDao(): CharacterDao

    companion object {
        const val FILE_NAME = "promptforge.db"
    }
}
