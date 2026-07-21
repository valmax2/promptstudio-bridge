package com.promptforge.pro.coredatabase

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface LibraryDao {
    @Query("SELECT * FROM library_items ORDER BY updatedAtEpochMillis DESC")
    fun observeAll(): Flow<List<LibraryItemEntity>>

    // Ricerca full-text semplice (§2: "ricerca full-text"): LIKE su italiano/inglese/tag
    // è sufficiente per una libreria personale; FTS4/5 è un'ottimizzazione rimandabile
    // a quando servisse davvero (migliaia di elementi).
    @Query(
        """
        SELECT * FROM library_items
        WHERE draftItalianText LIKE '%' || :query || '%'
           OR draftEnglishText LIKE '%' || :query || '%'
           OR tagsJson LIKE '%' || :query || '%'
        ORDER BY updatedAtEpochMillis DESC
        """,
    )
    fun search(query: String): Flow<List<LibraryItemEntity>>

    @Query("SELECT * FROM library_items WHERE favorite = 1 ORDER BY updatedAtEpochMillis DESC")
    fun observeFavorites(): Flow<List<LibraryItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: LibraryItemEntity)

    @Update
    suspend fun update(item: LibraryItemEntity)

    @Delete
    suspend fun delete(item: LibraryItemEntity)
}
