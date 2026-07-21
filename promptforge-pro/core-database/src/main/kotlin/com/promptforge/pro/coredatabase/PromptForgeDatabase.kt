package com.promptforge.pro.coredatabase

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * `version = 1`: prima release dello schema. Ogni cambio di schema futuro
 * richiede una `Migration` esplicita — niente `fallbackToDestructiveMigration`,
 * la libreria dell'utente non è usa-e-getta (§10: "tutti i modelli persistiti
 * devono essere versionati per consentire migrazioni future").
 */
@Database(
    entities = [LibraryItemEntity::class, PromptPresetEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class PromptForgeDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao
    abstract fun presetDao(): PresetDao

    companion object {
        const val FILE_NAME = "promptforge.db"
    }
}
