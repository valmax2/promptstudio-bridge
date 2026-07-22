package com.aicreator.offline

import android.content.Context
import com.aicreator.offline.data.local.datastore.SettingsDataStore
import com.aicreator.offline.data.local.db.AppDatabase
import com.aicreator.offline.data.local.files.ModelPackageReader
import com.aicreator.offline.data.local.files.PrivateStorageManager
import com.aicreator.offline.data.repository.CharacterRepositoryImpl
import com.aicreator.offline.data.repository.GalleryRepositoryImpl
import com.aicreator.offline.data.repository.HistoryRepositoryImpl
import com.aicreator.offline.data.repository.LoraRepositoryImpl
import com.aicreator.offline.data.repository.ModelRepositoryImpl
import com.aicreator.offline.data.repository.PresetRepositoryImpl
import com.aicreator.offline.domain.conditioning.FaceConditioningModule
import com.aicreator.offline.domain.conditioning.FullBodyConditioningModule
import com.aicreator.offline.domain.engine.InferenceEngineFactory
import com.aicreator.offline.domain.engine.mediapipe.MediaPipeImageGenerationEngine
import com.aicreator.offline.domain.hardware.DeviceCapabilityAnalyzer
import com.aicreator.offline.domain.repository.CharacterRepository
import com.aicreator.offline.domain.repository.GalleryRepository
import com.aicreator.offline.domain.repository.HistoryRepository
import com.aicreator.offline.domain.repository.LoraRepository
import com.aicreator.offline.domain.repository.ModelRepository
import com.aicreator.offline.domain.repository.PresetRepository
import com.aicreator.offline.domain.security.CryptoManager
import com.aicreator.offline.domain.translation.OfflinePromptTranslator
import com.aicreator.offline.domain.usecase.DeleteAllDataUseCase
import com.aicreator.offline.domain.usecase.GenerateImageUseCase
import com.aicreator.offline.domain.usecase.ImportModelUseCase
import com.aicreator.offline.domain.usecase.RecommendProfileUseCase
import com.aicreator.offline.ui.state.CharacterSelectionHolder
import com.aicreator.offline.ui.state.PendingParamsHolder
import com.aicreator.offline.worker.AiCreatorWorkerFactory

/**
 * Grafo delle dipendenze costruito a mano (vedi docs/ARCHITECTURE.md per il
 * perché niente Hilt/Dagger). Un'unica istanza, creata in
 * [AiCreatorApplication.onCreate] e riusata da tutte le Activity/ViewModel.
 */
class AppContainer(context: Context) {

    val appContext = context.applicationContext

    private val cryptoManager = CryptoManager(appContext)
    private val database = AppDatabase.build(appContext, cryptoManager)
    private val storage = PrivateStorageManager(appContext)
    private val packageReader = ModelPackageReader(appContext)

    val settingsDataStore = SettingsDataStore(appContext)
    val deviceCapabilityAnalyzer = DeviceCapabilityAnalyzer(appContext)
    val privateStorageManager = storage

    private val translator = OfflinePromptTranslator()
    val faceConditioning = FaceConditioningModule()
    val fullBodyConditioning = FullBodyConditioningModule()
    private val mediaPipeEngine = MediaPipeImageGenerationEngine(appContext, storage)
    private val engineFactory = InferenceEngineFactory(mediaPipeEngine)

    val modelRepository: ModelRepository = ModelRepositoryImpl(database.modelDao(), packageReader, storage)
    val loraRepository: LoraRepository = LoraRepositoryImpl(database.loraDao(), packageReader, storage)
    val presetRepository: PresetRepository = PresetRepositoryImpl(database.presetDao())
    val historyRepository: HistoryRepository = HistoryRepositoryImpl(database.historyDao())
    val galleryRepository: GalleryRepository = GalleryRepositoryImpl(database.historyDao(), storage)
    val characterRepository: CharacterRepository = CharacterRepositoryImpl(database.characterDao(), storage)

    val generateImageUseCase = GenerateImageUseCase(
        modelRepository = modelRepository,
        loraRepository = loraRepository,
        historyRepository = historyRepository,
        engineFactory = engineFactory,
        hardwareAnalyzer = deviceCapabilityAnalyzer,
        translator = translator,
        faceConditioning = faceConditioning,
        fullBodyConditioning = fullBodyConditioning,
    )
    val recommendProfileUseCase = RecommendProfileUseCase(deviceCapabilityAnalyzer)
    val deleteAllDataUseCase = DeleteAllDataUseCase(
        modelRepository = modelRepository,
        loraRepository = loraRepository,
        presetRepository = presetRepository,
        historyRepository = historyRepository,
        characterRepository = characterRepository,
        storage = storage,
        settingsDataStore = settingsDataStore,
    )
    val importModelUseCase = ImportModelUseCase(appContext)
    val characterSelectionHolder = CharacterSelectionHolder()
    val pendingParamsHolder = PendingParamsHolder()

    val workerFactory = AiCreatorWorkerFactory(modelRepository, loraRepository)
}
