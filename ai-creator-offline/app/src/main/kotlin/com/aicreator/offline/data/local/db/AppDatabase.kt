package com.aicreator.offline.data.local.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.aicreator.offline.data.local.db.dao.CharacterDao
import com.aicreator.offline.data.local.db.dao.HistoryDao
import com.aicreator.offline.data.local.db.dao.LoraDao
import com.aicreator.offline.data.local.db.dao.ModelDao
import com.aicreator.offline.data.local.db.dao.PresetDao
import com.aicreator.offline.data.local.db.entities.CharacterEntity
import com.aicreator.offline.data.local.db.entities.HistoryEntity
import com.aicreator.offline.data.local.db.entities.LoraEntity
import com.aicreator.offline.data.local.db.entities.ModelEntity
import com.aicreator.offline.data.local.db.entities.PresetEntity
import com.aicreator.offline.domain.security.CryptoManager
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import java.util.concurrent.atomic.AtomicBoolean

@Database(
    entities = [ModelEntity::class, LoraEntity::class, PresetEntity::class, HistoryEntity::class, CharacterEntity::class],
    version = 1,
    // exportSchema=false per semplicità di template: per una pubblicazione con
    // migrazioni gestite in produzione, impostare true e configurare
    // room.schemaLocation in app/build.gradle.kts (ksp { arg(...) }).
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun modelDao(): ModelDao
    abstract fun loraDao(): LoraDao
    abstract fun presetDao(): PresetDao
    abstract fun historyDao(): HistoryDao
    abstract fun characterDao(): CharacterDao

    /**
     * Usato da "Cancella tutti i dati" dopo aver svuotato ogni tabella: le righe rimosse con
     * DELETE restano fisicamente nelle pagine libere del file cifrato finché non vengono
     * sovrascritte, quindi in teoria recuperabili con la stessa chiave finché il file non viene
     * compattato. VACUUM riscrive il file compattandolo, eliminando questi residui.
     */
    fun vacuum() {
        openHelper.writableDatabase.execSQL("VACUUM")
    }

    companion object {
        private const val DATABASE_NAME = "aicreator_offline.db"

        private val nativeLibraryLoaded = AtomicBoolean(false)

        /**
         * La libreria net.zetetic:sqlcipher-android (quella corrente, non la
         * deprecata android-database-sqlcipher) NON carica da sola la propria
         * libreria nativa: è l'app a doverlo fare esplicitamente con
         * System.loadLibrary("sqlcipher") prima di aprire qualunque database,
         * altrimenti si ha UnsatisfiedLinkError su nativeOpen (crash all'avvio).
         * Requisito documentato nel README ufficiale della libreria.
         */
        private fun ensureNativeLibraryLoaded() {
            if (nativeLibraryLoaded.compareAndSet(false, true)) {
                System.loadLibrary("sqlcipher")
            }
        }

        /**
         * Il database è cifrato con SQLCipher: la passphrase viene generata e
         * conservata tramite Android Keystore (vedi CryptoManager), mai in chiaro.
         * Soddisfa il requisito "Database locale cifrato quando possibile".
         */
        fun build(context: Context, cryptoManager: CryptoManager): AppDatabase {
            ensureNativeLibraryLoaded()
            val passphrase = cryptoManager.getOrCreateDatabasePassphrase()
            val factory = SupportOpenHelperFactory(passphrase)
            return Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, DATABASE_NAME)
                .openHelperFactory(factory)
                .build()
        }
    }
}
