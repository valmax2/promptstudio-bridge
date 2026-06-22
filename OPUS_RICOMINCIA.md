# Cucina 360° — Prompt per Opus (ripartenza da zero)

## Istruzioni per Opus

Ho già un progetto Flutter parziale ma con problemi di configurazione Gradle/JVM.
Voglio che tu lo ricrei da zero nel modo corretto, partendo da `flutter create`.

**Cosa fare:**
1. Mostrami il comando `flutter create` corretto
2. Dammi il `pubspec.yaml` completo con le dipendenze
3. Dammi tutto il codice Dart di `lib/` file per file
4. Non toccare la cartella `android/` — la genera Flutter automaticamente

---

## Cos'è l'app

**Cucina 360°** — app Android (Flutter, iOS in futuro) che permette di:
1. Scattare 6-20 foto della cucina da angoli diversi
2. Assemblarle in una panoramica 360° (stitching, tutto in locale)
3. Visualizzarla in modo immersivo con il giroscopio del telefono
4. Toccare una superficie e cambiarne il colore (ante, pareti, ecc.)
5. Salvare e confrontare versioni colore diverse

**Tutto offline, nessun cloud, nessun abbonamento AI.**

---

## Monetizzazione

**Free:** max 2 progetti, max 8 foto, 20 colori RAL, risoluzione standard
**Premium (5,99€ una tantum):** progetti illimitati, 20 foto, palette RAL completa, export HD, condivisione

---

## Stack tecnico

```yaml
dependencies:
  flutter:
    sdk: flutter
  camera: ^0.10.5+9
  sensors_plus: ^4.0.2
  drift: ^2.18.0
  sqlite3_flutter_libs: ^0.5.20
  path_provider: ^2.1.3
  path: ^1.9.0
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  go_router: ^13.2.1
  in_app_purchase: ^3.1.13
  panorama_viewer: ^1.0.0
  image: ^4.1.7
  google_fonts: ^6.2.1
  flutter_colorpicker: ^1.1.0
  permission_handler: ^11.3.1
  uuid: ^4.4.0
  intl: ^0.19.0
  shared_preferences: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  drift_dev: ^2.18.0
  build_runner: ^2.4.9
  riverpod_generator: ^2.4.0
```

---

## Struttura cartelle lib/

```
lib/
├── main.dart
├── app/
│   ├── app.dart          ← MaterialApp.router
│   ├── router.dart       ← GoRouter con 5 routes
│   └── theme.dart        ← design system scuro (teal + viola)
├── features/
│   ├── home/             ← lista progetti (GridView)
│   ├── camera/           ← scatto foto + overlay bussola
│   ├── stitching/        ← progress bar assemblaggio
│   ├── viewer/           ← panorama 360° con giroscopio
│   └── editor/           ← editor colori HSV + palette RAL
├── data/
│   ├── database/         ← Drift/SQLite (3 tabelle)
│   └── repository/       ← ProgettoRepository
├── core/
│   ├── vision/           ← StitchingEngine + ColorEditor
│   ├── rendering/        ← SensorHelper (giroscopio)
│   └── purchase/         ← PurchaseService (in_app_purchase)
└── shared/
    ├── widgets/           ← AppCard, PremiumBadge, PaywallSheet
    └── constants/         ← ral_colors.dart (40 colori RAL)
```

---

## Database (Drift)

```dart
// 3 tabelle:

@DataClassName('Progetto')
class Progetti extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get nome => text().withLength(min: 1, max: 100)();
  DateTimeColumn get dataCreazione => dateTime()();
  TextColumn get thumbnailPath => text().nullable()();
  TextColumn get panoramaPath => text().nullable()();
}

@DataClassName('FotoData')
class Foto extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  TextColumn get filePath => text()();
  IntColumn get ordine => integer()();
  RealColumn get orientamentoGradi => real().withDefault(const Constant(0))();
  DateTimeColumn get timestamp => dateTime()();
}

@DataClassName('VersioneColore')
class VersioniColore extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  DateTimeColumn get timestamp => dateTime()();
  TextColumn get descrizione => text().withDefault(const Constant(''))();
  TextColumn get parametriJson => text()();
  TextColumn get anteprimaPath => text().nullable()();
}
```

---

## Logica principale

### Freemium gate
```dart
// PurchaseService è ChangeNotifierProvider
// isPremiumProvider = Provider<bool> che ascolta PurchaseService

if (!isPremium && progetti.length >= 2) → mostra PaywallSheet
if (!isPremium && fotoScattate >= 8) → blocca scatto
if (!isPremium && coloreIndex >= 20) → mostra PaywallSheet
```

### StitchingEngine
```dart
// Pipeline: carica foto → ridimensiona a 1080p → affianca orizzontalmente
// (placeholder CPU con package `image`)
// TODO: integrare opencv_dart per stitching reale con ORB + homography

Stream<StitchingState> assembla(List<String> fotoPaths, int progettoId)
// Stati: StitchingIdle | StitchingProcessing(progress, step) | StitchingSuccess(path) | StitchingError(msg)
```

### ColorEditor (HSV)
```dart
// 1. Flood fill HSV dal pixel toccato (tolleranza ΔH=15, ΔS=0.3, ΔV=0.4)
// 2. Cambia H del colore scelto, scala S relativamente, mantiene V (preserva ombre)
// 3. Undo/redo stack (ultimi 10 stati)

Future<ColorSelection?> seleziona(int px, int py)
Future<img.Image> applicaColore(ColorSelection sel, double hue, double sat)
```

### SensorHelper
```dart
// Fonde giroscopio + accelerometro per orientamento 360°
// Interpolazione lerp(0.12) per movimento fluido
// Calibrazione al primo frame

ValueNotifier<({double yaw, double pitch})> rotation
```

---

## Design system

| Token | Valore |
|---|---|
| Background | `#0A0A0F` |
| Surface | `#14141C` |
| Primary | `#00C9A7` (teal) |
| Secondary | `#A78BFA` (viola) |
| Error | `#FF6B6B` |
| Testo primario | `#F0F0F6` |
| Testo secondario | `#72728E` |
| Border radius card | 16dp |
| Font | Google Fonts Inter |

---

## Richiesta a Opus

Ricrea questo progetto Flutter da zero nel modo corretto:

1. Parti con `flutter create --org com.valmax2 --project-name cucina360 cucina360`
2. Sostituisci il `pubspec.yaml` con quello che ti ho dato sopra
3. Scrivi tutto il codice Dart in `lib/` seguendo la struttura e la logica descritta
4. Non modificare la cartella `android/` generata da flutter create
5. Alla fine dammi il comando `dart run build_runner build -d` per generare i file Drift

**Inizia dal file `lib/main.dart` e poi procedi schermata per schermata.**
