package com.aicreator.offline.domain.model

import android.graphics.Bitmap

enum class ExportFormat(val mimeType: String, val compressFormat: Bitmap.CompressFormat, val extension: String) {
    PNG("image/png", Bitmap.CompressFormat.PNG, "png"),
    JPG("image/jpeg", Bitmap.CompressFormat.JPEG, "jpg"),
    WEBP("image/webp", Bitmap.CompressFormat.WEBP_LOSSLESS, "webp"),
}
