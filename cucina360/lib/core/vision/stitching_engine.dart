import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

sealed class StitchingState {
  const StitchingState();
}

class StitchingIdle extends StitchingState {
  const StitchingIdle();
}

class StitchingProcessing extends StitchingState {
  const StitchingProcessing(this.progress, this.step);
  final int progress;     // 0–100
  final String step;
}

class StitchingSuccess extends StitchingState {
  const StitchingSuccess(this.panoramaPath);
  final String panoramaPath;
}

class StitchingError extends StitchingState {
  const StitchingError(this.message);
  final String message;
}

class StitchingEngine {
  // Assembla le foto in una panoramica equirettangolare.
  //
  // Implementazione attuale: fallback CPU con la libreria `image` di Dart
  // (affiancamento orizzontale semplice). In produzione, sostituire con
  // OpenCV via FFI (vedere TODO sotto).
  //
  // TODO: integrare opencv_dart per stitching con ORB + RANSAC + blending.
  Stream<StitchingState> assembla(List<String> fotoPaths, int progettoId) async* {
    if (fotoPaths.length < 2) {
      yield const StitchingError('Servono almeno 2 foto');
      return;
    }

    yield const StitchingProcessing(5, 'Caricamento immagini…');

    try {
      // Carica e ridimensiona le immagini in un isolate separato
      final images = await compute(_caricaImmagini, fotoPaths);
      if (images.isEmpty) {
        yield const StitchingError('Impossibile caricare le immagini');
        return;
      }

      yield const StitchingProcessing(30, 'Analisi keypoints…');
      await Future.delayed(const Duration(milliseconds: 200));

      yield const StitchingProcessing(60, 'Assemblaggio panoramica…');

      // Fallback: affiancamento orizzontale (placeholder finché OpenCV non è integrato)
      final panorama = await compute(_affiancaImmagini, images);

      yield const StitchingProcessing(85, 'Salvataggio file…');

      final outputPath = await _salva(panorama, progettoId);

      yield StitchingSuccess(outputPath);
    } catch (e) {
      yield StitchingError('Errore durante lo stitching: $e');
    }
  }

  static List<img.Image> _caricaImmagini(List<String> paths) {
    return paths.map((path) {
      final bytes = File(path).readAsBytesSync();
      final image = img.decodeImage(bytes);
      if (image == null) return null;
      // Ridimensiona a 1080px di altezza mantenendo le proporzioni
      return img.copyResize(image, height: 1080);
    }).whereType<img.Image>().toList();
  }

  static img.Image _affiancaImmagini(List<img.Image> images) {
    final totalWidth = images.fold(0, (sum, i) => sum + i.width);
    final height = images.map((i) => i.height).reduce((a, b) => a > b ? a : b);
    final panorama = img.Image(width: totalWidth, height: height);
    var offsetX = 0;
    for (final image in images) {
      img.compositeImage(panorama, image, dstX: offsetX);
      offsetX += image.width;
    }
    return panorama;
  }

  Future<String> _salva(img.Image panorama, int progettoId) async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, 'progetti', '$progettoId'));
    await dir.create(recursive: true);
    final path = p.join(dir.path, 'panorama.jpg');
    final encoded = img.encodeJpg(panorama, quality: 92);
    await File(path).writeAsBytes(encoded);
    return path;
  }
}
