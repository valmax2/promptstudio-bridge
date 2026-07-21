plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

// Modulo Kotlin puro: solo data class e logica di dominio, nessuna dipendenza
// Android. Compilabile e testabile su JVM anche senza Android SDK.
dependencies {
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit)
}
