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

> **Nota sul checksum.** Il valore `checksumSha256` copre **tutti i file del
> pacchetto tranne `manifest.json` stesso** (il manifest non può contenere la
> propria impronta). L'algoritmo esatto è in `ChecksumUtil.sha256Directory`
> ed è replicato in `tools/make_model_package.py`: non calcolarlo a mano, usa
> lo script (vedi sotto), che genera direttamente un `manifest.json` valido.

## 2. Motore "mediapipe-image-generator" — procedura verificata

MediaPipe richiede un modello Stable Diffusion **1.5** convertito con lo script
ufficiale Google. Tutto quanto segue si fa **su PC**, non nell'app. Requisiti
realistici: Python 3, diversi GB di spazio libero, e — per generare comodamente
sul telefono — idealmente 8 GB di RAM sul dispositivo (vedi la schermata
Diagnostica dell'app).

### 2.1 Procurati un checkpoint SD 1.5

Serve un file checkpoint PyTorch `.ckpt` in formato EMA-only compatibile con
`stable-diffusion-v1-5` (di cui possiedi i diritti d'uso). Non SDXL, non SD2/3,
non FLUX.

### 2.2 Converti con lo script ufficiale MediaPipe

Script: `tools/image_generator_converter/convert.py` del repo
[google-ai-edge/mediapipe-samples](https://github.com/google-ai-edge/mediapipe-samples/tree/main/tools/image_generator_converter).

```
pip install torch typing_extensions numpy Pillow requests pytorch_lightning absl-py
python3 convert.py --ckpt_path /percorso/al/modello.ckpt --output_path ./bins
```

Produce la cartella `./bins/` con i file convertiti (una serie di `.bin`).

### 2.3 Impacchetta per l'app

Usa lo script incluso in questo repo, che crea la cartella nella struttura
richiesta e genera un `manifest.json` con il **checksum corretto**:

```
python3 tools/make_model_package.py \
    --model-dir ./bins \
    --out ./SD15Mobile \
    --id sd15-mobile \
    --name "Stable Diffusion 1.5 (mobile)" \
    --min-ram-mb 6000 \
    --recommended-resolution 512 \
    --max-steps 20
```

Risultato: `./SD15Mobile/` con dentro `model/` (i `.bin`) e `manifest.json`.

### 2.4 Importa nell'app

1. Copia la cartella `SD15Mobile/` sul telefono (via cavo USB, oppure
   `adb push SD15Mobile /sdcard/Download/`).
2. Nell'app: **Modelli → Importa modello da cartella** → seleziona `SD15Mobile/`.
3. L'app verifica il checksum e, se tutto torna, il modello diventa attivo e
   selezionabile in **Genera**.

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
