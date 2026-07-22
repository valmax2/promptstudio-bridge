# Architettura — AI Creator Offline

MVVM + Repository Pattern, DI manuale (nessun framework DI: il progetto è
abbastanza piccolo perché un `AppContainer` esplicito sia più semplice e
trasparente di Hilt/Koin, coerente con "preferisci la soluzione più semplice").

```
UI (Compose)  →  ViewModel  →  UseCase (dominio)  →  Repository (interfaccia)
                                                          ↓
                                        RepositoryImpl (dati: Room / DataStore / file)
                                                          ↓
                                            InferenceEngine (interfaccia)
                                                          ↓
                                MediaPipeImageGenerationEngine | motori futuri
```

- **UI** non conosce Room, file system o MediaPipe: parla solo con i ViewModel.
- **ViewModel** espone `StateFlow` di UI state, chiama use case, non contiene
  logica di business complessa.
- **UseCase** orchestra repository + motore di inferenza per un'operazione
  completa (es. `GenerateImageUseCase` = valida parametri → stima memoria →
  chiama `InferenceEngine` → salva risultato in galleria/cronologia).
- **Repository** astrae la persistenza; le implementazioni usano Room
  (cifrato via SQLCipher), DataStore (preferenze) e file privati dell'app.
- **InferenceEngine** è l'unico punto di contatto con un motore concreto:
  sostituirlo (es. aggiungere ONNX Runtime Mobile) non tocca UI/ViewModel/Repository.

## Albero completo del progetto

```
ai-creator-offline/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradlew / gradlew.bat
├── gradle/
│   ├── libs.versions.toml
│   └── wrapper/gradle-wrapper.properties
├── docs/
│   ├── FEASIBILITY.md
│   ├── ARCHITECTURE.md
│   ├── MODEL_CONVERSION.md
│   ├── SIGNING.md
│   └── TODO.md
├── README.md
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── kotlin/com/aicreator/offline/
        │   │   ├── AiCreatorApplication.kt
        │   │   ├── AppContainer.kt
        │   │   ├── MainActivity.kt
        │   │   ├── navigation/
        │   │   │   ├── AppDestinations.kt
        │   │   │   └── AppNavHost.kt
        │   │   ├── ui/
        │   │   │   ├── theme/{Color,Theme,Type}.kt
        │   │   │   ├── components/{ParameterControls,ModelCard,MemoryBadge,SectionHeader}.kt
        │   │   │   └── screens/
        │   │   │       ├── lock/LockScreen.kt
        │   │   │       ├── home/{HomeScreen,HomeViewModel}.kt
        │   │   │       ├── generate/{GenerateScreen,GenerateViewModel,GenerateUiState}.kt
        │   │   │       ├── character/{CharacterScreen,CharacterViewModel}.kt
        │   │   │       ├── face/FaceModeScreen.kt
        │   │   │       ├── fullbody/FullBodyModeScreen.kt
        │   │   │       ├── models/{ModelsScreen,ModelsViewModel}.kt
        │   │   │       ├── lora/{LoraScreen,LoraViewModel}.kt
        │   │   │       ├── presets/{PresetsScreen,PresetsViewModel}.kt
        │   │   │       ├── history/{HistoryScreen,HistoryViewModel}.kt
        │   │   │       ├── gallery/{GalleryScreen,GalleryViewModel}.kt
        │   │   │       ├── diagnostics/{DiagnosticsScreen,DiagnosticsViewModel}.kt
        │   │   │       └── settings/{SettingsScreen,SettingsViewModel}.kt
        │   │   ├── domain/
        │   │   │   ├── model/ (GenerationParams, GenerationRequest, GenerationResult,
        │   │   │   │            AiModel, LoraAdapter, DevicePreset, DeviceProfile,
        │   │   │   │            CharacterReference, HistoryEntry, Preset, ModelManifest)
        │   │   │   ├── engine/ (InferenceEngine, GenerationProgress, EngineCapabilities,
        │   │   │   │            InferenceEngineFactory)
        │   │   │   ├── engine/mediapipe/MediaPipeImageGenerationEngine.kt
        │   │   │   ├── engine/placeholder/UnavailableInferenceEngine.kt
        │   │   │   ├── conditioning/ (CharacterConditioningModule, FaceConditioningModule,
        │   │   │   │                  FullBodyConditioningModule)
        │   │   │   ├── hardware/ (DeviceCapabilityAnalyzer, DeviceProfileRecommender,
        │   │   │   │              DeviceSnapshot)
        │   │   │   ├── translation/OfflinePromptTranslator.kt
        │   │   │   ├── security/ (CryptoManager, BiometricAuthManager)
        │   │   │   └── usecase/ (GenerateImageUseCase, StopGenerationUseCase,
        │   │   │                  ImportModelUseCase, DeleteModelUseCase,
        │   │   │                  RecommendProfileUseCase, SavePresetUseCase,
        │   │   │                  ApplyPresetUseCase, DeleteAllDataUseCase,
        │   │   │                  ExportImageUseCase)
        │   │   ├── data/
        │   │   │   ├── local/db/ (AppDatabase, entities/*, dao/*)
        │   │   │   ├── local/datastore/SettingsDataStore.kt
        │   │   │   ├── local/files/ (PrivateStorageManager, ChecksumUtil,
        │   │   │   │                  ModelPackageReader)
        │   │   │   └── repository/ (Model/Generation/Preset/Gallery/Character/
        │   │   │                     SettingsRepository + Impl)
        │   │   ├── worker/ (ModelImportWorker, ChecksumWorker)
        │   │   └── util/ (Result.kt, PrivacyLogger.kt)
        │   └── res/
        │       ├── values/{strings.xml,colors.xml,themes.xml}
        │       ├── values-night/themes.xml
        │       ├── xml/{data_extraction_rules.xml,file_paths.xml}
        │       └── mipmap-*/ic_launcher*.xml (adaptive icon, vettoriale)
        ├── devTools/AndroidManifest.xml
        ├── test/kotlin/com/aicreator/offline/ (unit test)
        └── androidTest/kotlin/com/aicreator/offline/ (test strumentali)
```

## Perché niente Hilt/Dagger

`AppContainer.kt` costruisce a mano il grafo delle dipendenze (poche decine di
classi). Per un progetto di queste dimensioni evita la complessità di
annotation processing/KSP aggiuntivo e rende esplicito e ispezionabile ogni
collegamento — scelta deliberata, non un'omissione.

## Perché SQLCipher e non solo Room

Room da solo non cifra il database SQLite sottostante. Il requisito
"database locale cifrato quando possibile" è soddisfatto passando a Room una
`SupportOpenHelperFactory` di SQLCipher (`net.zetetic:sqlcipher-android`), con la
chiave di cifratura generata e conservata tramite Android Keystore
(`CryptoManager`), mai in chiaro nel codice o nelle preferenze.
