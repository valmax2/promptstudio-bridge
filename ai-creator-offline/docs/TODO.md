# Parti ancora da completare

Elenco onesto di ciò che questo export **non** fa ancora, per non far
credere che sia tutto pronto all'uso.

## Bloccanti per una generazione reale (richiedono materiale esterno)

1. **Nessun modello incluso**: `MediaPipeImageGenerationEngine` è
   un'integrazione reale dell'API `com.google.mediapipe.tasks.vision.imagegenerator.ImageGenerator`,
   ma senza un bundle modello valido (vedi `MODEL_CONVERSION.md`) restituisce
   uno stato di errore comprensibile invece di generare immagini. Questo è
   intenzionale: non c'è codice che finge di generare.
2. **Conversione modelli**: nessuno script di conversione checkpoint→bundle
   MediaPipe è incluso (va usato il tooling ufficiale MediaPipe, esterno a
   questo repo). Vedi `MODEL_CONVERSION.md`.

## Non implementato (progettato ma assente, non simulato)

3. **Motore ONNX Runtime Mobile alternativo**: l'interfaccia `InferenceEngine`
   lo prevede, `InferenceEngineFactory` ha un branch commentato che spiega
   dove agganciarlo, ma la classe `OnnxRuntimeImageGenerationEngine` non
   esiste. Richiede: esportazione ONNX di text encoder/UNet/VAE, scheduler
   Kotlin, gestione NNAPI/XNNPACK execution provider.
4. **InstantID / PuLID**: documentati in `FEASIBILITY.md` come troppo pesanti
   o non maturi per mobile allo stato attuale; nessuna implementazione, solo
   l'interfaccia `CharacterConditioningModule` pronta ad accoglierli in
   futuro.
5. **Upscaling locale**: previsto nel dominio (`GenerationParams.upscale`)
   ma senza un modello di upscaling incluso/collegato; il flag esiste, la
   UI lo espone come "richiede un modello di upscaling importato", ma
   l'esecuzione effettiva dipende da un modello che l'utente deve importare
   e da un adapter engine-specifico non ancora scritto.
6. **Traduzione prompt IT→EN**: implementata come dizionario offline
   (`OfflinePromptTranslator`) con un set di voci comuni per prompt di
   generazione immagini; non è un modello di traduzione neurale. Copre i
   termini più frequenti (soggetti, stili, luce, camera), non è una
   traduzione completa e libera.
7. **Icone/risorse grafiche**: launcher icon e icone in-app sono vettoriali
   generate per questo progetto (Compose/`ImageVector` o XML vector
   drawable), non asset grafici professionali disegnati da un designer.

## Test

8. Test presenti: unit test su logica pura (diagnostica hardware, traduzione
   offline, checksum, repository preset) e un test strumentale minimo di
   navigazione. **Non** presente: test end-to-end della pipeline di
   generazione reale (richiederebbe un modello vero da eseguire in CI, fuori
   scope per un ambiente CI standard senza GPU mobile).

## Verifica di build

9. **Non è stato eseguito un build Gradle completo** in questo ambiente di
   generazione: manca l'Android SDK e l'accesso di rete a `dl.google.com`/
   `services.gradle.org` necessario a scaricare AGP, le dipendenze Google e
   il wrapper Gradle. Il codice è stato scritto e revisionato manualmente
   con la massima attenzione alla correttezza sintattica e alle API reali,
   ma la prima build va fatta in un Android Studio con SDK configurato.
   Vedi `README.md` → "Verifica prima del primo commit dell'utente".

## Firma release

10. Nessun keystore incluso (giustamente: non deve esserlo). Vedi
    `SIGNING.md` per generarne uno.
