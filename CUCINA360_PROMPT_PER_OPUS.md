# Prompt per Opus — App Cucina 360° con Editor Colori

> Copia e incolla tutto questo testo su Claude Opus.
> Alla fine aggiungi una delle richieste specifiche elencate in fondo.

---

## Contesto del progetto

Sto progettando un'app Android nativa chiamata **Cucina 360°**. L'app consente a un utente (tipicamente un rivenditore di cucine o un privato) di:

1. Scattare più foto della propria cucina da angoli diversi con il telefono
2. Far assemblare automaticamente le foto in una **panoramica a 360°** direttamente sul dispositivo
3. Navigare la panoramica in modo immersivo muovendo il telefono (giroscopio)
4. Toccare una superficie nella panoramica (ad es. le ante) e **cambiare il colore** in tempo reale, senza connessione internet

**Tutto il processing avviene in locale**, senza cloud, senza abbonamenti AI. L'app deve funzionare offline.

Target: Android 8.0+ (API 26+), Kotlin, architettura MVVM.

---

## Stack tecnico scelto

| Componente | Tecnologia |
|---|---|
| Linguaggio | Kotlin |
| UI | Jetpack Compose (Material 3) |
| Camera | CameraX |
| Visione artificiale | OpenCV per Android (stitching, segmentazione HSV) |
| Rendering 360° | OpenGL ES 2.0 con mesh sferica |
| Sensori | SensorManager (TYPE_ROTATION_VECTOR) |
| Database | Room (SQLite) con entità Progetto, Foto, VersioneColore |
| Architettura | MVVM + Repository pattern + Kotlin Coroutines |
| DI | Hilt |

---

## Struttura del progetto Android (cartelle)

```
app/
├── data/
│   ├── db/
│   │   ├── AppDatabase.kt
│   │   ├── dao/ (ProgettoDao, FotoDao, VersioneColoreDao)
│   │   └── entity/ (Progetto, Foto, VersioneColore)
│   └── repository/
│       └── ProgettoRepository.kt
├── domain/
│   └── usecase/
│       ├── StitchImagesUseCase.kt
│       ├── ChangeColorUseCase.kt
│       └── SaveProgettoUseCase.kt
├── ui/
│   ├── home/          ← lista progetti
│   ├── camera/        ← schermata scatto foto
│   ├── stitching/     ← progress stitching + preview
│   ├── viewer/        ← viewer 360° immersivo
│   └── editor/        ← editor colori superfici
├── vision/
│   ├── StitchingEngine.kt   ← OpenCV stitching wrapper
│   └── ColorEditor.kt       ← segmentazione HSV + cambio colore
├── rendering/
│   ├── SphereRenderer.kt    ← OpenGL ES renderer
│   ├── SphereGeometry.kt    ← mesh sferica UV
│   └── SensorRotationHelper.kt
└── di/
    └── AppModule.kt
```

---

## Modulo 1 — Fotocamera (CameraX)

**Schermata:** `CameraScreen.kt`

Funzionalità:
- Anteprima live della fotocamera con `PreviewView`
- Pulsante di scatto (ImageCapture use case)
- Contatore foto scattate (minimo consigliato: 8–12 foto per una buona panoramica)
- Indicatore visivo dell'angolo di scatto (bussola / frecce direzionali sovrapposte al viewfinder)
- Le foto vengono salvate in `filesDir` dell'app (non nella galleria)
- Salvataggio metadati EXIF (orientamento, timestamp)
- Al termine (pulsante "Assembla"), passa le foto allo stitching engine

**Permessi necessari:** `CAMERA`, `READ_EXTERNAL_STORAGE` (API < 33)

**Requisiti qualità:** JPEG qualità 95, risoluzione massima supportata dal sensore.

---

## Modulo 2 — Stitching Panoramico (OpenCV)

**Classe:** `StitchingEngine.kt`

Pipeline di stitching:
1. Caricamento delle immagini (`Mat` di OpenCV)
2. Ridimensionamento a 2MP per velocizzare l'estrazione features (l'originale viene mantenuto)
3. Estrazione keypoints con **ORB** (più veloce di SIFT su mobile, licenza libera)
4. Matching con **BFMatcher** + filtro Lowe's ratio test (0.75)
5. Calcolo **homography** con RANSAC
6. Warping cilindrico o sferico (`cv::warpPerspective`)
7. Blending con `cv::detail::MultiBandBlender`
8. Output: bitmap panoramica unica (formato equirettangolare per il viewer 360°)

Alternativa più semplice: usare la classe `cv::Stitcher` di OpenCV con mode `PANORAMA` o `SCANS` — meno controllo ma molto più rapida da implementare.

**Gestione errori:** se lo stitching fallisce (foto troppo diverse, poca sovrapposizione), mostrare messaggio chiaro e suggerire di riprendere le foto.

**Thread:** tutto il processing in `Dispatchers.Default`, progress tramite `Flow<StitchingState>`.

```kotlin
sealed class StitchingState {
    object Idle : StitchingState()
    data class Processing(val progress: Int, val step: String) : StitchingState()
    data class Success(val panoramaBitmap: Bitmap) : StitchingState()
    data class Error(val message: String) : StitchingState()
}
```

---

## Modulo 3 — Viewer 360° (OpenGL ES + Sensori)

**Classi:** `SphereRenderer.kt`, `SphereGeometry.kt`, `SensorRotationHelper.kt`

Funzionamento:
- La panoramica equirettangolare viene caricata come **texture OpenGL**
- La mesh è una sfera con le UV mappate all'interno (l'utente è al centro)
- La camera virtuale è orientata dal **vettore di rotazione** del telefono (`TYPE_ROTATION_VECTOR`)
- Il `SensorEventListener` aggiorna la matrice di rotazione in ogni frame
- Interpolazione con `lerp` (fattore 0.1) per ammorbidire i movimenti

**Parametri della sfera:**
- Raggio: 1.0 (unità arbitrarie)
- Segmenti latitudine: 64, longitudine: 128
- Campo visivo (FOV): 90°

**Touch gesture:**
- Pinch-to-zoom (campo visivo variabile tra 60° e 120°)
- Swipe manuale come alternativa al giroscopio (per chi non vuole muovere il telefono)

**Transizione:** quando si entra nel viewer, fade-in dalla schermata stitching.

---

## Modulo 4 — Editor Colori (OpenCV HSV)

**Classe:** `ColorEditor.kt`

Funzionamento:
1. L'utente tocca una superficie nella panoramica
2. Si preleva il pixel toccato e si rileva il range HSV dominante nell'area (flood fill con tolleranza)
3. La maschera della selezione viene visualizzata con un bordo tratteggiato animato
4. L'utente sceglie un nuovo colore da un **color picker** (cerchio HSV o palette predefinita di colori RAL)
5. Il cambio colore avviene nello spazio HSV: si mantengono i canali S (saturazione relativa) e V (luminosità) originali, si sostituisce solo H (hue) — questo preserva ombre e texture
6. Il risultato viene renderizzato in tempo reale sulla texture OpenGL

**Formula di cambio colore (HSV):**
```
nuovo_H = hue_scelto_dall'utente
nuovo_S = S_originale * (S_nuovo_colore / S_medio_selezione)  // scala relativa
nuovo_V = V_originale  // invariato per preservare luci/ombre
```

**Undo/Redo:** stack delle ultime 10 operazioni con `ArrayDeque`.

**Palette colori:** includere 40 colori RAL classici per cucine (bianco alpino RAL 9010, grigio antracite RAL 7016, verde salvia RAL 6021, ecc.) con preview chip.

---

## Modulo 5 — Database (Room)

**Entità principali:**

```kotlin
@Entity
data class Progetto(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nome: String,
    val dataCreazione: Long,
    val thumbnailPath: String?,
    val panoramaPath: String?
)

@Entity
data class Foto(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val progettoId: Long,
    val filePath: String,
    val ordine: Int,
    val timestamp: Long,
    val orientamentoGradi: Float
)

@Entity
data class VersioneColore(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val progettoId: Long,
    val timestamp: Long,
    val descrizione: String,
    val parametriJson: String  // serializzato: quale area, quale hue
)
```

---

## Flusso utente completo

```
[Home] → [Nuovo Progetto] → [Fotocamera: scatta 8-12 foto]
       → [Stitching: progress bar + anteprima]
       → [Viewer 360°: naviga con giroscopio]
       → [Editor: tocca superficie → scegli colore → anteprima live]
       → [Salva versione] → [Home: lista progetti con thumbnail]
```

---

## Design UI (stile)

- **Palette**: sfondo scuro (`#0D0D0D`), teal accent (`#00BFA5`), testo bianco (`#F5F5F5`)
- **Tipografia**: Roboto / Inter
- **Stile card**: angoli arrotondati 16dp, ombra leggera, bordo `#1E1E1E`
- **Bottoni**: pill shape, colore primario teal, pressed state con ripple
- **Animazioni**: Material motion (shared element transition tra lista e viewer)
- L'app deve sembrare **professionale e moderna**, adatta a rivenditori di cucine

---

## Sfide tecniche note

| Sfida | Soluzione proposta |
|---|---|
| Stitching lento su telefono | Ridimensionare le foto prima del processing; usare `cv::Stitcher` con mode PANORAMA |
| Deriva del giroscopio | Fondere giroscopio + accelerometro con `SensorManager.getRotationMatrix` |
| Segmentazione imprecisa su superfici lucide | Aumentare la tolleranza HSV; offrire selezione manuale con pennello |
| Uso memoria con bitmap grandi | Caricare la panoramica come texture OpenGL a tile, non tutta in RAM |
| OpenCV su Kotlin | Usare `OpenCVLoader.initAsync` con fallback; includere le .so via `implementation 'org.opencv:opencv:4.8.0'` (Maven) |

---

## Richieste specifiche per Opus

Scegli una (o più) da aggiungere dopo questo testo:

1. **"Genera la struttura completa del progetto Android con tutti i file Kotlin vuoti, i `build.gradle` con le dipendenze corrette e il `AndroidManifest.xml`."**

2. **"Scrivi il codice completo di `StitchingEngine.kt` che usa `cv::Stitcher` di OpenCV 4.8 per Android in Kotlin, con coroutine e Flow per il progress."**

3. **"Scrivi il codice completo del Viewer 360° in OpenGL ES 2.0: `SphereRenderer.kt`, `SphereGeometry.kt`, `SensorRotationHelper.kt`."**

4. **"Scrivi il codice completo di `ColorEditor.kt` con segmentazione HSV, flood fill, cambio colore che preserva texture/ombre e undo/redo."**

5. **"Crea mockup dettagliati (ASCII art o descrizione SVG) di tutte le schermate: Home, Fotocamera, Stitching progress, Viewer 360°, Editor colori."**

6. **"Progetta la schermata Fotocamera in Jetpack Compose con CameraX, overlay direzionale per guidare l'utente negli angoli di scatto, contatore foto e pulsante Assembla."**

7. **"Dammi il piano di sviluppo sprint-by-sprint (4 settimane) per costruire questa app partendo da zero, con le milestone e i rischi principali."**
