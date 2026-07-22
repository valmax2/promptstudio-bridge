plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.aicreator.offline"
    // compileSdk/targetSdk: API 36 (Android 16), la piattaforma stabile piu' recente
    // supportata da AGP 8.13. Se in Android Studio hai una SDK piu' recente, aggiorna qui.
    compileSdk = 36

    defaultConfig {
        applicationId = "com.aicreator.offline"
        // minSdk 26 richiesto esplicitamente: sotto questa soglia mancano API essenziali
        // (BiometricPrompt robusto, Keystore StrongBox, storage scoped moderno).
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
    }

    signingConfigs {
        create("release") {
            // Valori forniti tramite variabili d'ambiente / -P properties in fase di build.
            // Vedi docs/SIGNING.md per la procedura completa. Nessuna credenziale e' hardcoded.
            val storeFilePath = project.findProperty("AICREATOR_STORE_FILE") as String?
            val storePwd = project.findProperty("AICREATOR_STORE_PASSWORD") as String?
            val keyAliasName = project.findProperty("AICREATOR_KEY_ALIAS") as String?
            val keyPwd = project.findProperty("AICREATOR_KEY_PASSWORD") as String?

            if (storeFilePath != null) {
                storeFile = file(storeFilePath)
                storePassword = storePwd
                keyAlias = keyAliasName
                keyPassword = keyPwd
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (project.hasProperty("AICREATOR_STORE_FILE")) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    flavorDimensions += "connectivity"
    productFlavors {
        // Flavor "offline": nessun permesso INTERNET, build consigliata per l'uso reale.
        create("offline") {
            dimension = "connectivity"
            buildConfigField("boolean", "NETWORK_CAPABLE", "false")
        }
        // Flavor "offlineDebugTools": identico a offline ma abilita INTERNET solo per
        // scaricare pesi di modelli di TEST durante lo sviluppo (mai in release Play Store).
        // Nessun dato dell'utente (prompt, foto, immagini generate) viaggia in rete in nessun flavor:
        // questo flag riguarda solo l'eventuale download manuale di un modello dimostrativo.
        create("devTools") {
            dimension = "connectivity"
            applicationIdSuffix = ".devtools"
            buildConfigField("boolean", "NETWORK_CAPABLE", "true")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
        // SQLCipher (net.zetetic:sqlcipher-android) carica una libreria nativa (libsqlcipher.so):
        // con il packaging "compresso" di default alcuni dispositivi falliscono a caricarla a
        // runtime (UnsatisfiedLinkError, crash immediato all'avvio). useLegacyPackaging la
        // estrae/allinea come le versioni precedenti di AGP, evitando il problema.
        jniLibs {
            useLegacyPackaging = true
        }
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)

    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    implementation(libs.sqlcipher.android)
    implementation(libs.androidx.sqlite)

    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.biometric)
    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.androidx.documentfile)

    // Motore di inferenza on-device reale per generazione immagini (vedi docs/FEASIBILITY.md).
    implementation(libs.mediapipe.tasks.vision.image.generator)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
}
