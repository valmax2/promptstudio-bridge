# Cucina 360° — Documento di Progetto Completo
## (Da incollare su Opus per ottenere codice, mockup e architettura)

---

## Visione del prodotto

**Cucina 360°** è un'app mobile (Flutter) che permette a chiunque — privati e rivenditori di cucine — di:

1. Scattare più foto della cucina da angoli diversi
2. Assemblarle automaticamente in una **panoramica a 360°** sul dispositivo (offline)
3. Navigarla in modo immersivo muovendo il telefono (giroscopio)
4. **Cambiare il colore** di ante, pareti e superfici in tempo reale
5. Salvare e confrontare versioni colore diverse

**Piattaforme target:** Android (prima, su Play Store) → iOS in futuro (App Store).
Poiché iOS è già pianificato, il progetto è **Flutter** dalla prima riga.
Tutto il processing è **in locale, offline**, senza costi cloud per l'utente.

---

## Monetizzazione — Modello Freemium

### Piano Free
- Massimo **2 progetti** salvati
- Massimo **8 foto** per stitching
- Palette di **20 colori** predefiniti
- Panoramica in risoluzione **standard** (max 4K)
- Watermark discreto sull'export

### Piano Premium (acquisto in-app una tantum — target 5,99 €)
- Progetti **illimitati**
- Fino a **20 foto** per stitching (panoramica più precisa)
- **Palette RAL completa** (200+ colori con nome e codice RAL)
- Export panoramica in **full resolution** senza watermark
- **Storico versioni colore** per ogni progetto (fino a 20 versioni)
- Funzione **Condividi** (esporta immagine colorata come JPEG/PNG)

> Implementazione acquisto in-app con `in_app_purchase` Flutter plugin
> (supporta Google Play Billing e Apple StoreKit 2 con lo stesso codice Dart).

---

## Tech Stack Flutter

| Layer | Tecnologia | Note |
|---|---|---|
| Framework | Flutter 3.x | Dart, Material 3 |
| Camera | `camera` plugin | iOS + Android |
| Visione artificiale | `opencv_dart` + FFI | Stitching, segmentazione HSV |
| Viewer 360° | `flutter_gl` + shader custom | Texture su mesh sferica |
| Sensori | `sensors_plus` | Giroscopio + accelerometro |
| Database | `drift` (SQLite type-safe) | Progetti, foto, versioni colore |
| State management | **Riverpod** | AsyncNotifier per ogni modulo |
| In-app purchase | `in_app_purchase` | Free/Premium gate |
| Navigazione | `go_router` | Deep link, named routes |
| DI | Riverpod providers | No package extra necessario |
| Asset storage | `path_provider` | File locali (foto, panoramiche) |

---

## Struttura cartelle Flutter

```
lib/
├── main.dart
├── app/
│   ├── app.dart                  ← MaterialApp + GoRouter
│   ├── router.dart
│   └── theme.dart                ← colori, tipografia, stile
├── features/
│   ├── home/                     ← lista progetti
│   │   ├── home_screen.dart
│   │   └── home_provider.dart
│   ├── camera/                   ← scatto foto
│   │   ├── camera_screen.dart
│   │   └── camera_provider.dart
│   ├── stitching/                ← assemblaggio panoramica
│   │   ├── stitching_screen.dart
│   │   └── stitching_provider.dart
│   ├── viewer/                   ← viewer 360° immersivo
│   │   ├── viewer_screen.dart
│   │   ├── sphere_widget.dart    ← OpenGL widget
│   │   └── viewer_provider.dart
│   └── editor/                   ← editor colori
│       ├── editor_screen.dart
│       ├── color_picker_sheet.dart
│       └── editor_provider.dart
├── data/
│   ├── database/
│   │   ├── app_database.dart     ← drift DB
│   │   └── tables/              ← Progetto, Foto, VersioneColore
│   ├── repository/
│   │   └── progetto_repository.dart
│   └── models/
│       └── progetto.dart
├── core/
│   ├── vision/
│   │   ├── stitching_engine.dart ← wrapper OpenCV via FFI
│   │   └── color_editor.dart     ← segmentazione HSV
│   ├── rendering/
│   │   ├── sphere_renderer.dart  ← OpenGL ES
│   │   └── sensor_helper.dart   ← giroscopio → matrice rotazione
│   └── purchase/
│       └── purchase_service.dart ← in_app_purchase wrapper
└── shared/
    ├── widgets/                  ← bottoni, card, loader comuni
    └── constants/
        └── ral_colors.dart       ← 200 colori RAL con codice e nome
```

---

## Modulo 1 — Home Screen

Lista di tutti i progetti salvati nel DB locale.

**UI:**
- `GridView` 2 colonne di card progetto
- Ogni card: thumbnail panoramica, nome progetto, data, numero versioni colore
- FAB "+" → flusso Nuovo Progetto
- Badge "PRO" sulle feature bloccate
- Pull-to-refresh
- Empty state: illustrazione + "Crea il tuo primo progetto"

---

## Modulo 2 — Fotocamera

**UI:**
- Viewfinder fullscreen (`camera` plugin)
- Overlay con:
  - **Bussola animata** in alto: indica la direzione verso cui ruotare
  - **Contatore foto** (es. "5 / 8 minimo")
  - **Thumbnail strip** delle foto già scattate in basso
- Pulsante scatto grande centrale
- Pulsante "Assembla →" attivo dopo minimo 6 foto

**Logica:**
- Salva ogni foto in `getApplicationDocumentsDirectory()/progetti/{id}/foto_{n}.jpg`
- Qualità JPEG 95, massima risoluzione del sensore
- Registra orientamento in gradi con `sensors_plus` al momento dello scatto

---

## Modulo 3 — Stitching (OpenCV)

**UI:**
- Schermata di attesa con progress bar animata
- Step label: "Analisi keypoints…" / "Calcolo omografia…" / "Blending…"
- Tempo stimato (es. "circa 30 secondi")
- Al termine: anteprima miniatura della panoramica + pulsante "Apri Viewer"

**Engine (`core/vision/stitching_engine.dart`):**

Si chiama codice C++ tramite `dart:ffi` o usa `opencv_dart`.

Pipeline:
```
Input: List<File> foto (6–20 immagini)
  1. Ridimensiona a 2MP per feature extraction (originali mantenuti)
  2. Estrai keypoints con ORB (o usa cv::Stitcher in mode PANORAMA)
  3. Match BFMatcher + filtro ratio Lowe 0.75
  4. Calcola homography con RANSAC
  5. Warp cilindrico / sferico
  6. MultiBandBlending
Output: File panoramica equirettangolare (JPEG, percorso locale)
```

Alternativa rapida: `cv::Stitcher::create(PANORAMA)` — meno controllo, molto più semplice.

Esponi lo stato come `Stream<StitchingState>`:
```dart
sealed class StitchingState {
  const factory StitchingState.idle() = _Idle;
  const factory StitchingState.processing(int progress, String step) = _Processing;
  const factory StitchingState.success(String panoramaPath) = _Success;
  const factory StitchingState.error(String message) = _Error;
}
```

---

## Modulo 4 — Viewer 360°

**Widget:** `SphereWidget` (usa `flutter_gl` o `Texture` + `PlatformView`)

Funzionamento:
- Panoramica equirettangolare → texture OpenGL
- Mesh sferica con UV interni (utente al centro della sfera)
- Orientamento dalla fusione giroscopio + accelerometro (`SensorManager` via FFI o `sensors_plus`)
- Aggiornamento matrice rotazione ad ogni frame (60fps target)
- Interpolazione `lerp(currentRot, targetRot, 0.12)` per fluidità

**Gesture:**
- Pinch-to-zoom: FOV da 60° a 120°
- Swipe manuale (override al giroscopio, per chi tiene il telefono fermo)

**UI overlay:**
- Bottone "Editor colori" in basso a destra → transizione a Editor
- Bottone "Indietro" top-left
- Mini-mappa 2D del punto di vista corrente (opzionale, fase 2)

---

## Modulo 5 — Editor Colori

**UI:**
- La panoramica viene mostrata come immagine piatta (non 3D) per facilitare la selezione
- L'utente tocca una zona → appare la selezione con bordo tratteggiato animato
- Bottom sheet con:
  - **Palette RAL** (chip di colore con codice es. "RAL 9010 — Bianco Puro")
  - **Color wheel** custom per colori liberi (free tier: solo palette RAL base)
  - Pulsanti Undo / Redo
  - Pulsante "Applica al Viewer" → aggiorna la texture 3D in tempo reale

**Logica HSV (`core/vision/color_editor.dart`):**
```
1. Pixel toccato → campiona colore HSV in area 10x10px
2. Flood fill con tolleranza ΔH=15, ΔS=30, ΔV=40 → genera maschera
3. Per ogni pixel nella maschera:
   nuovo_H = H_colore_scelto
   nuovo_S = S_originale * (S_colore_scelto / S_medio_maschera)
   nuovo_V = V_originale  ← invariato (preserva luci e ombre)
4. Applica all'immagine, aggiorna texture OpenGL
```

**Undo/Redo:** `List<Uint8List>` delle ultime 10 versioni (immagine compressa).

---

## Database (Drift / SQLite)

```dart
// Tabelle principali

class Progetti extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get nome => text()();
  DateTimeColumn get dataCreazione => dateTime()();
  TextColumn get thumbnailPath => text().nullable()();
  TextColumn get panoramaPath => text().nullable()();
}

class Foto extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  TextColumn get filePath => text()();
  IntColumn get ordine => integer()();
  RealColumn get orientamentoGradi => real().withDefault(const Constant(0))();
}

class VersioniColore extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  DateTimeColumn get timestamp => dateTime()();
  TextColumn get descrizione => text()();
  TextColumn get parametriJson => text()();  // {area, hue, sat}
  TextColumn get anteprima => text().nullable()();  // path JPEG
}
```

---

## Design System

| Token | Valore |
|---|---|
| Background | `#0A0A0F` |
| Surface | `#14141C` |
| Card border | `#1E1E2E` |
| Primary accent | `#00C9A7` (teal) |
| Secondary accent | `#A78BFA` (viola) |
| Error | `#FF6B6B` |
| Testo primario | `#F0F0F6` |
| Testo secondario | `#72728E` |
| Font | Inter (Google Fonts) |
| Border radius card | 16dp |
| Elevazione card | 0 (border, no shadow) |

**Animazioni:** Material motion shared-element tra Home → Viewer.
**Icona app:** cucina stilizzata + cerchio 360° + gradiente teal/viola.

---

## Flusso Free vs Premium (gate logica)

```dart
// In purchase_service.dart
bool get isPremium => _purchaseState == PurchaseState.purchased;

// Gate nei provider
if (!purchaseService.isPremium && progetti.length >= 2) {
  throw PremiumRequiredException('Limite 2 progetti raggiunto');
}

// Gate nell'editor colori
if (!purchaseService.isPremium && coloriUsati > 20) {
  showPremiumBottomSheet(context);
  return;
}
```

**Paywall UI:** Bottom sheet con:
- Titolo "Sblocca Cucina 360° Pro"
- Lista feature premium con checkmark
- Prezzo (da Google Play / App Store)
- Pulsante "Acquista ora" e "Ripristina acquisti"

---

## Play Store — Checklist pubblicazione

- [ ] Crea account Google Play Console (25$ una tantum)
- [ ] Firma APK / AAB con chiave di rilascio (keystore)
- [ ] Icona app: 512x512 PNG, sfondo non trasparente
- [ ] Feature graphic: 1024x500 PNG
- [ ] Screenshot: 2-8 per ogni form factor (phone, tablet)
- [ ] Descrizione breve (80 char) e lunga (4000 char)
- [ ] Privacy Policy URL (obbligatoria, anche senza dati cloud — i dati rimangono in locale)
- [ ] Content rating: PEGI 3 / Everyone
- [ ] Dichiarazione ADA / accessibility
- [ ] Configura prodotto in-app in Play Console: ID `premium_unlock`, tipo "non-consumabile"

---

## App Store (iOS — fase futura)

Flutter genera `.ipa` dalla stessa codebase. Differenze da gestire:
- `Info.plist`: permission strings per camera e sensori in italiano/inglese
- `StoreKit 2` gestito automaticamente da `in_app_purchase` plugin
- Testflight per beta testing prima del rilascio
- App Store Connect: stesso iter di Play Store

---

## Sfide tecniche

| Sfida | Soluzione |
|---|---|
| OpenCV su Flutter | `opencv_dart` su pub.dev (wrapper Dart con FFI) oppure codice C++ nativo via FFI |
| OpenGL ES su Flutter | `flutter_gl` plugin oppure `Texture` widget con rendering nativo via MethodChannel |
| Drift del giroscopio | `sensors_plus` con fusion vector: `SensorEvent.TYPE_ROTATION_VECTOR` |
| Memoria bitmap grandi | Tiling della texture panoramica, non caricarla tutta in RAM |
| Stitching lento su mid-range | Ridimensiona a 2MP prima del processing; mostra progress step-by-step |
| Segmentazione superfici lucide | Tolleranza HSV adattiva; fallback: selezione manuale con pennello |
| In-app purchase sandbox | Usare Google Play test account; sul simulatore iOS usare StoreKit configuration |

---

## Prompt pronti per Opus

Aggiungi uno di questi alla fine del testo sopra:

1. **"Genera tutta la struttura Flutter del progetto: `pubspec.yaml` con tutte le dipendenze, cartelle, file Dart vuoti con imports e class stub per ogni modulo."**

2. **"Scrivi il codice completo di `stitching_engine.dart` con FFI che chiama OpenCV C++ per assemblare le foto in panoramica equirettangolare. Includi anche il codice C++ (`stitching.cpp`)."**

3. **"Scrivi il Viewer 360° completo: `sphere_widget.dart` con `flutter_gl`, la mesh sferica UV, e `sensor_helper.dart` per la rotazione dal giroscopio."**

4. **"Scrivi `color_editor.dart` completo: flood fill HSV, formula cambio colore che preserva ombre/texture, undo/redo stack, integrazione con la texture OpenGL del viewer."**

5. **"Crea mockup grafici dettagliati (descrizione SVG o ASCII art strutturata) di tutte le schermate: Home, Fotocamera con overlay bussola, Stitching progress, Viewer 360°, Editor colori con bottom sheet palette RAL, Paywall premium."**

6. **"Scrivi il `purchase_service.dart` completo con `in_app_purchase`, gestione stati (pending/purchased/error), ripristino acquisti, e i widget Paywall bottom sheet e badge PRO."**

7. **"Scrivi la schermata Fotocamera completa in Flutter: preview CameraX, overlay bussola direzionale animata, thumbnail strip delle foto scattate, contatore, logica salvataggio file."**

8. **"Dammi il piano di sviluppo sprint-by-sprint (6 settimane) per arrivare alla prima versione Play Store: milestone, dipendenze tra moduli, rischi e come mitigarli."**
