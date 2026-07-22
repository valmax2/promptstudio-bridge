# Analisi di fattibilità — AI Creator Offline

Questo documento precede il codice, come richiesto: fattibilità, scelta del motore
di inferenza, architettura, limiti realistici, albero del progetto.

## 1. Fattibilità

Generare immagini con un modello tipo Stable Diffusion **interamente sul telefono**,
senza server, è realistico nel 2026 ma con vincoli precisi:

- **È fattibile** con modelli quantizzati (INT8 / FP16) di dimensioni contenute
  (SD 1.5-class, ~1-2 GB in formato mobile; varianti distillate/turbo con pochi
  passi, ~400 MB - 1 GB) su smartphone con **6-8 GB di RAM** e GPU/NPU moderne.
- **È marginale** su fascia bassa (3-4 GB RAM, nessuna NPU/GPU delegate utile):
  possibile solo a risoluzioni basse (384×384) con modelli fortemente compressi,
  tempi di generazione lunghi (30-90 s+) e alto rischio di OOM: per questo il
  profilo Base deve essere estremamente conservativo e l'app deve **misurare**,
  non solo dichiarare, la RAM libera prima di ogni generazione.
- **Non è fattibile** in questo progetto: SDXL "pieno" (>6 GB di pesi), modelli
  video, training/fine-tuning di LoRA on-device (richiede troppa RAM/tempo),
  upscaling con modelli pesanti multi-GB. Questi restano fuori scope o vengono
  degradati (es. upscaler leggero tipo ESRGAN-mobile quantizzato, se importato
  dall'utente).
- I **pesi dei modelli non sono e non saranno mai inclusi** nel repository:
  licenza, dimensione e potenziale copyright lo impediscono. Il progetto fornisce
  tutta l'infrastruttura di import/validazione (Model Manager) ma l'utente deve
  procurarsi e convertire i pesi separatamente (vedi `MODEL_CONVERSION.md`).

## 2. Confronto motori di inferenza on-device

| Motore | Adatto a SD-like su Android? | Note |
|---|---|---|
| **MediaPipe Tasks — Image Generation** | **Sì, è la scelta più realistica** | API ufficiale Google (`com.google.mediapipe:tasks-vision-image-generator`) pensata *esattamente* per questo: diffusion condizionato da testo, backend GPU delegate, supporto nativo a **plugin LoRA** caricati a runtime e a **immagini di condizionamento** (face landmark, depth, edge — concettualmente simile a ControlNet "leggero"). Richiede modelli convertiti nel formato bundle MediaPipe (non pesi SD grezzi). |
| **ONNX Runtime Mobile** | Sì, come piano B / motore alternativo | Generico, non specifico per diffusion: bisogna orchestrare manualmente UNet + VAE + text encoder come grafi ONNX separati, gestire lo scheduler in Kotlin. Più lavoro, ma flessibile e ben documentato per NNAPI/XNNPACK/CoreML-equivalenti Android. Utile come motore alternativo dietro la stessa interfaccia astratta. |
| **TensorFlow Lite** | Sì con limiti | Analogo a ONNX Runtime: richiede spezzare la pipeline SD in più modelli `.tflite` ed eseguirli in sequenza; nessuna libreria "diffusion-ready" pronta come MediaPipe. |
| **ncnn (Tencent)** | Tecnicamente sì, ma fuori scope pratico | Usato in progetti community (es. porting SD su ncnn) con buone prestazioni GPU Vulkan, ma senza binding Kotlin ufficiali: richiederebbe wrapper JNI scritto da zero e manutenzione di un fork. Troppo pesante da mantenere per questo progetto. |
| **MNN (Alibaba)** | Tecnicamente dimostrato, non ufficiale/stabile per terzi | Esistono demo MNN-Diffusion, ma è un motore cinese con documentazione EN limitata, nessun pacchetto Maven ufficiale stabile per import diretto in Gradle: da valutare in futuro come motore aggiuntivo, non come base al lancio. |
| **ExecuTorch (PyTorch)** | Ancora immaturo per questo caso d'uso | Buono per modelli generici PyTorch→mobile, ma senza un percorso pronto e documentato per pipeline diffusion multi-stadio su Android al livello di maturità di MediaPipe. |

**Scelta**: **MediaPipe Tasks — Image Generation** come motore primario, dietro
un'interfaccia astratta (`InferenceEngine`), con **ONNX Runtime Mobile** indicato
come motore secondario collegabile senza riscrivere l'app (stesso contratto).
Questo risponde anche al requisito "sistema modulare, sostituibile senza
riscrivere tutta l'app".

## 3. Coerenza del personaggio: cosa è realistico su smartphone

| Tecnica | Fattibilità on-device (2026) |
|---|---|
| **IP-Adapter** (immagine di riferimento → embedding di condizionamento) | **Realistico**, se convertito in un piccolo encoder immagine + proiezione compatibile col motore scelto. È la tecnica più leggera delle citate: un solo forward pass extra sull'immagine di riferimento. Implementata come modulo "Volto" e "Full Body" tramite `CharacterConditioningModule`. |
| **ControlNet leggero** (posa/edge/depth) | **Parzialmente realistico**: le varianti "light"/distillate (poche decine di MB) sono usabili; ControlNet "pieno" (~1.4 GB per condizionamento) è troppo pesante da tenere in RAM insieme a UNet+VAE su fascia media. MediaPipe Image Generator espone nativamente `ConditionOptions` (face/depth/edge) pensate per questo. |
| **LoRA** | **Realistico**: pesi tipicamente 10-200 MB, applicabili a runtime senza rifare il modello base. MediaPipe Image Generator supporta il caricamento di plugin LoRA nativamente: è il meccanismo scelto per lo stile/personaggio "addestrato". |
| **InstantID** | **Richiede conversione pesante**: si basa su un modello di face-embedding (tipicamente ArcFace/InsightFace) + IP-Adapter dedicato al volto + a volte ControlNet aggiuntivo. Il face-embedding backbone può girare on-device (piccolo), ma l'intera pipeline InstantID nella sua forma "reference" è pensata per GPU desktop; su mobile va ridotta al solo blocco face-embedding + IP-Adapter, scartando i pezzi più pesanti. Trattata come "avanzata/sperimentale", non nel percorso base. |
| **PuLID** | **Troppo pesante allo stato attuale**: richiede un training contrastivo e componenti aggiuntivi (ID loss network) che non hanno ancora un percorso di conversione mobile maturo e documentato. Fuori scope per la prima versione. |

Il modulo di coerenza personaggio è quindi implementato come interfaccia
(`CharacterConditioningModule`) con **due implementazioni fornite**:
`FaceConditioningModule` (leggero, IP-Adapter-style, per "Ritratto e volto")
e `FullBodyConditioningModule` (IP-Adapter-style esteso + eventuale
ControlNet-light per posa, per "Figura intera"). InstantID/PuLID restano
documentati come possibili moduli futuri collegabili alla stessa interfaccia,
non implementati con codice finto.

## 4. Limiti realistici per fascia di dispositivo (stime, non garanzie)

| Fascia (RAM totale) | Risoluzione consigliata | Passi | Tempo indicativo per immagine | Note |
|---|---|---|---|---|
| ≤ 3 GB | Non supportata | — | — | App segnala dispositivo non compatibile, mostra diagnostica e disattiva Genera. |
| 4 GB | 384×384 | 8-12 (modello "turbo"/pochi passi) | 40-120 s su CPU/NNAPI | Profilo Base obbligatorio, batteria risparmio consigliato. |
| 6 GB | 512×512 | 15-20 | 20-60 s con GPU delegate | Profilo Base o Bilanciato. |
| 8 GB+ con GPU/NPU moderna | 768×768 (fino a 1024×1024 se il modello importato lo supporta) | 20-30 | 8-25 s | Profilo Realistico, upscaling locale opzionale. |

Questi numeri sono **stime di riferimento per il design della UI** (badge di
stima memoria/tempo), non promesse: il `DeviceCapabilityAnalyzer` misura il
dispositivo reale a runtime e li aggiorna di conseguenza.

## 5. Architettura scelta

MVVM + Repository Pattern, moduli separati per: dominio (motore di inferenza
astratto, use case), dati (Room cifrato con SQLCipher, DataStore, storage
privato per galleria/modelli), UI (Jetpack Compose + Navigation). Dettagli in
`ARCHITECTURE.md`.

## 6. Albero del progetto

Vedi `ARCHITECTURE.md` per l'albero completo dei file, generato prima della
scrittura del codice.
