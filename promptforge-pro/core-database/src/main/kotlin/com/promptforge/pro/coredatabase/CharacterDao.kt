package com.promptforge.pro.coredatabase

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CharacterDao {
    @Query("SELECT * FROM character_profiles ORDER BY updatedAtEpochMillis DESC")
    fun observeAll(): Flow<List<CharacterProfileEntity>>

    @Query("SELECT * FROM character_profiles WHERE id = :id")
    suspend fun getById(id: String): CharacterProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(character: CharacterProfileEntity)

    @Delete
    suspend fun delete(character: CharacterProfileEntity)
}
