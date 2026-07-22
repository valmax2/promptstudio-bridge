# Regole R8/ProGuard per AI Creator Offline.
# Room genera codice a runtime tramite riflessione sugli @Entity/@Dao: manteniamo gli schema.
-keep class com.aicreator.offline.data.local.db.** { *; }

# MediaPipe Tasks usa JNI e riflessione per il bridge nativo: non offuscare i suoi package.
-keep class com.google.mediapipe.** { *; }
-dontwarn com.google.mediapipe.**

# SQLCipher usa JNI: mantieni i binding nativi.
-keep class net.zetetic.database.** { *; }
-dontwarn net.zetetic.database.**

# I modelli di dominio serializzati in JSON per i pacchetti modello devono restare intatti.
-keep class com.aicreator.offline.domain.model.** { *; }
