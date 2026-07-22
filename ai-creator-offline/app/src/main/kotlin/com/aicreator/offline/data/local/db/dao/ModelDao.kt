package com.aicreator.offline.data.local.db.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.aicreator.offline.data.local.db.entities.ModelEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ModelDao {
    @Query("SELECT * FROM models ORDER BY importedAt DESC")
    fun observeAll(): Flow<List<ModelEntity>>

    @Query("SELECT * FROM models WHERE id = :id")
    suspend fun findById(id: String): ModelEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: ModelEntity)

    @Update
    suspend fun update(entity: ModelEntity)

    @Delete
    suspend fun delete(entity: ModelEntity)

    @Query("UPDATE models SET isActive = :isActive WHERE id = :id")
    suspend fun setActive(id: String, isActive: Boolean)

    @Query("SELECT COUNT(*) FROM models WHERE checksumSha256 = :checksum")
    suspend fun countByChecksum(checksum: String): Int

    @Query("DELETE FROM models")
    suspend fun deleteAll()
}
