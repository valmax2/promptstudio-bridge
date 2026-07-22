# Importare e convertire modelli

L'app **non include alcun peso di modello**. Questa guida spiega come
procurarsi e preparare un modello compatibile, da importare poi con il
Model Manager (schermata "Modelli").

## 1. Formato pacchetto richiesto dall'app

Ogni modello importato deve essere una **cartella** (scelta dall'utente
tramite Storage Access Framework) con questa struttura, letta da
`ModelPackageReader`:

```
NomeModello/
├── manifest.json        # obbligatorio — vedi schema sotto
├── model/                # bundle del motore (per MediaPipe: cartella .task o file richiesti)
├── vae/                  # opzionale, se separato dal bundle principale
├── tokenizer/             # opzionale, se separato
├── preview.jpg           # opzionale — anteprima mostrata nella lista modelli
├── LICENSE.txt           # opzionale ma fortemente consigliato
└── loras/                 # opzionale — sotto-cartella con adattatori LoRA compatibili
```

### Schema `manifest.json`

```json
{
  "id": "sd15-turbo-mobile-int8",
  "displayName": "SD 1.5 Turbo (INT8, mobile)",
  "version": "1.0.0",
  "engine": "mediapipe-image-generator",
  "sizeBytes": 1073741824,
  "minRamMb": 3000,
  "recommendedResolution": 512,
  "maxSteps": 20,
  "checksumSha256": "…",
  "license": "vedi LICENSE.txt",
  "supportsLora": true,
  "notes": "Testo libero facoltativo"
}
```

Campi obbligatori: `id`, `displayName`, `engine`, `sizeBytes`, `minRamMb`,
`checksumSha256`. Il Model Manager rifiuta l'import se mancano o se il
checksum calcolato non corrisponde.

## 2. Motore "mediapipe-image-generator" (consigliato)

MediaPipe richiede un modello di diffusion convertito nel proprio formato
bundle. Il percorso ufficiale Google (MediaPipe Model Maker / script di
conversione forniti nella documentazione MediaPipe "Image Generation") parte
tipicamente da un checkpoint Stable Diffusion 1.5-class in formato
Diffusers/PyTorch e produce i file richiesti dal runtime MediaPipe. Passi ad
alto livello (da eseguire su PC, **non nell'app**, con gli strumenti ufficiali
MediaPipe):

1. Procurati un checkpoint SD 1.5-class di cui possiedi i diritti d'uso.
2. Segui la guida ufficiale MediaPipe "Image generation task" per la
   conversione del checkpoint nel bundle richiesto (il processo esatto e gli
   script cambiano con le versioni di MediaPipe: fai riferimento sempre alla
   documentazione della versione che usi, dichiarata in
   `gradle/libs.versions.toml` → `mediapipeImageGenerator`).
3. Copia il bundle risultante nella cartella `model/` del pacchetto.
4. Calcola lo SHA-256 del bundle (l'app lo rifà comunque in fase di import,
   ma serve per compilare `manifest.json`).
5. Importa la cartella dall'app: Modelli → Importa → seleziona la cartella.

## 3. Motore "onnx-runtime" (alternativo, predisposto ma non implementato)

L'interfaccia `InferenceEngine` è pronta per un secondo motore basato su
ONNX Runtime Mobile. Manca l'implementazione concreta
(`OnnxRuntimeImageGenerationEngine`, non presente in questo progetto):
richiederebbe di esportare separatamente text encoder, UNet e VAE in ONNX e
orchestrare lo scheduler in Kotlin. Segnalato in `TODO.md` come lavoro futuro,
non finto con codice che non fa nulla.

## 4. LoRA

Cartella `loras/<nome-lora>/` con un file dei pesi (dimensione tipica
10-200 MB) + un piccolo `lora_manifest.json` (`id`, `displayName`,
`baseModelId`, `sizeBytes`, `checksumSha256`). Il Model Manager li elenca
nella schermata "LoRA e adattatori" solo se `baseModelId` corrisponde a un
modello già importato e attivo.

## 5. Cosa NON fare

- Non inserire pesi `.onnx`, `.tflite`, `.bin`, `.safetensors`, `.ckpt`,
  `.gguf` nel repository: sono esclusi da `.gitignore` di proposito.
- Non usare modelli senza verificarne la licenza d'uso.
- Non tentare di caricare modelli che generano contenuti relativi a minori o
  contenuti illegali: l'app è per uso personale e contenuti leciti soltanto,
  come da requisito di prodotto; non esiste e non va aggiunto alcun bypass a
  questo principio.
