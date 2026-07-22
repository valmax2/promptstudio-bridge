package com.aicreator.offline.data.local.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "characters")
data class CharacterEntity(
    @PrimaryKey val id: String,
    val name: String,
    val imagePath: String,
    val mode: String,
    val createdAt: Long,
)
