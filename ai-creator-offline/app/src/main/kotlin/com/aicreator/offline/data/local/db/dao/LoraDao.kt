package com.aicreator.offline.data.local.db.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.aicreator.offline.data.local.db.entities.LoraEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LoraDao {
    @Query("SELECT * FROM loras ORDER BY importedAt DESC")
    fun observeAll(): Flow<List<LoraEntity>>

    @Query("SELECT * FROM loras WHERE baseModelId = :modelId ORDER BY importedAt DESC")
    fun observeForModel(modelId: String): Flow<List<LoraEntity>>

    @Query("SELECT * FROM loras WHERE id IN (:ids)")
    suspend fun findByIds(ids: List<String>): List<LoraEntity>

    @Query("DELETE FROM loras")
    suspend fun deleteAll()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: LoraEntity)

    @Delete
    suspend fun delete(entity: LoraEntity)

    @Query("DELETE FROM loras WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE loras SET isEnabled = :isEnabled WHERE id = :id")
    suspend fun setEnabled(id: String, isEnabled: Boolean)
}
