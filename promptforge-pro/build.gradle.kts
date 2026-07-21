// Root build file: dichiara soltanto i plugin (risolti dal version catalog) senza
// applicarli qui. Ogni modulo li applica singolarmente in base al proprio tipo.

// Versioni SDK condivise da tutti i moduli Android (vedi §1 del master prompt: minSdk 26+).
// SDK 34: stessa versione già usata con successo dal workflow CI di padel-app
// (vedi .github/workflows/build-padel-apk.yml), per non dipendere da un
// livello SDK che non ho potuto verificare essere scaricabile in CI.
extra["compileSdk"] = 34
extra["targetSdk"] = 34
extra["minSdk"] = 26

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.kotlin.kapt) apply false
    alias(libs.plugins.hilt.android.gradle) apply false
}
