plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

// Modulo Kotlin puro: client OkHttp/Retrofit verso servizi locali opzionali
// (LibreTranslate, Ollama, ComfyUI). Nessuna dipendenza Android: testabile su
// JVM con MockWebServer, senza bisogno dell'Android SDK.
dependencies {
    implementation(project(":core-model"))

    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.kotlinx.serialization)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.core)

    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
}
