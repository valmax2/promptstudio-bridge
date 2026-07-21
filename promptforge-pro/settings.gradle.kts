pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "promptforge-pro"

// Moduli Android (UI/Compose, o con dipendenze dal framework Android)
include(":app")
include(":core-ui")
include(":core-database")
include(":feature-builder")
include(":feature-director-map")
include(":feature-character-consistency")
include(":feature-library")
include(":feature-presets")
include(":feature-settings")
include(":feature-comfyui")
include(":translation")
include(":speech")

// Moduli Kotlin puri (nessuna dipendenza Android, testabili su JVM)
include(":core-model")
include(":core-network")
include(":prompt-engine")
