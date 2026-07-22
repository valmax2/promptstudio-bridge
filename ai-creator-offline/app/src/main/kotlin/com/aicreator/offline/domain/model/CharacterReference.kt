package com.aicreator.offline.domain.model

data class CharacterReference(
    val id: String,
    val name: String,
    /** URI del file immagine copiato nello storage privato dell'app (mai un content:// esterno vivo). */
    val imagePath: String,
    val mode: CharacterMode,
    val createdAt: Long,
)
