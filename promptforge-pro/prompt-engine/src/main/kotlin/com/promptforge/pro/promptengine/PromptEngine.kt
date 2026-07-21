package com.promptforge.pro.promptengine

import com.promptforge.pro.coremodel.GeneratedPrompt
import com.promptforge.pro.coremodel.PromptRequest

/**
 * Motore prompt puro Kotlin (§1, §7): nessuna dipendenza Android, nessun I/O.
 * Genera `request.output.variantCount` varianti che condividono soggetto,
 * azione e ambientazione ma variano in resa, composizione e regia.
 */
interface PromptEngine {
    fun generate(request: PromptRequest): List<GeneratedPrompt>
}
