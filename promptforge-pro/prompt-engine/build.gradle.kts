plugins {
    alias(libs.plugins.kotlin.jvm)
}

// Modulo Kotlin puro richiesto esplicitamente dal master prompt (§1, §7):
// "Il motore prompt deve essere un modulo Kotlin puro, indipendente
// dall'interfaccia e completamente testabile." Nessuna dipendenza Android.
dependencies {
    implementation(project(":core-model"))

    testImplementation(libs.junit)
}
