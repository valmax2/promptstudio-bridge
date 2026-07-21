package com.promptforge.pro.coredatabase

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PresetDao {
    @Query("SELECT * FROM prompt_presets ORDER BY isBuiltIn DESC, createdAtEpochMillis DESC")
    fun observeAll(): Flow<List<PromptPresetEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(preset: PromptPresetEntity)

    @Update
    suspend fun update(preset: PromptPresetEntity)

    @Delete
    suspend fun delete(preset: PromptPresetEntity)
}
