package com.promptforge.pro.coredatabase

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/** v1 → v2: aggiunge `character_profiles` (Character Studio, v7 §2/§8). */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS `character_profiles` (
                `id` TEXT NOT NULL,
                `name` TEXT NOT NULL,
                `referenceImageUrisJson` TEXT NOT NULL,
                `faceDescription` TEXT NOT NULL,
                `bodyDescription` TEXT NOT NULL,
                `hairDescription` TEXT NOT NULL,
                `skinDescription` TEXT NOT NULL,
                `outfitDescription` TEXT NOT NULL,
                `identifyingDetails` TEXT NOT NULL,
                `consistencyMethod` TEXT NOT NULL,
                `similarityStrength` REAL NOT NULL,
                `faceStructureStrength` REAL NOT NULL,
                `styleFreedom` REAL NOT NULL,
                `characterPackJson` TEXT NOT NULL,
                `createdAtEpochMillis` INTEGER NOT NULL,
                `updatedAtEpochMillis` INTEGER NOT NULL,
                `schemaVersion` INTEGER NOT NULL,
                PRIMARY KEY(`id`)
            )
            """.trimIndent(),
        )
    }
}
