package com.promptforge.pro.coremodel

import kotlinx.serialization.Serializable

@Serializable
data class OutputConfig(
    val targetModel: TargetModel = TargetModel.StableDiffusion,
    val aspectRatio: String = "1:1",
    val quality: String = "high detail, masterpiece",
    val seed: Long? = null,
    val variantCount: Int = 1,
    val schemaVersion: Int = 1,
) {
    init {
        require(variantCount in 1..8) { "variantCount fuori range 1..8: $variantCount" }
    }
}

/**
 * Termini negativi di base (§7) più eventuali aggiunte dell'utente. Non
 * include mai termini legati alla modalità adulti: "Non aggiungere
 * automaticamente nsfw, nudity, explicit o termini equivalenti al prompt
 * negativo quando la modalità adulti è attiva" (§7).
 */
@Serializable
data class NegativePromptConfig(
    val customTerms: List<String> = emptyList(),
    val schemaVersion: Int = 1,
) {
    companion object {
        val BaseTerms = listOf(
            "low quality", "blurry", "bad anatomy", "malformed hands", "extra fingers",
            "missing fingers", "duplicate person", "fused bodies", "identity drift",
            "contradictory action", "changed setting", "extra characters", "missing characters",
            "child", "underage", "ambiguous age",
        )
    }
}
