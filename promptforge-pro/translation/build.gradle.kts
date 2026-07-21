plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
}

// Modulo Android (non Compose): l'implementazione on-device usa API della
// piattaforma (ML Kit Translate), quindi non può essere un modulo Kotlin puro
// come prompt-engine. L'interfaccia TranslationEngine e il dizionario di
// fallback restano comunque testabili su JVM puro (JUnit, senza Robolectric).
android {
    namespace = "com.promptforge.pro.translation"
    compileSdk = rootProject.extra["compileSdk"] as Int

    defaultConfig {
        minSdk = rootProject.extra["minSdk"] as Int
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(project(":core-model"))
    implementation(project(":core-network"))
    implementation(libs.kotlinx.coroutines.android)

    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
}
