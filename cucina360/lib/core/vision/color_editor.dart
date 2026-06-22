import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

/// Risultato di una selezione touch con flood fill HSV
class ColorSelection {
  const ColorSelection({
    required this.maskPixels,
    required this.avgHue,
    required this.avgSaturation,
    required this.avgValue,
    required this.bounds,
  });

  final Set<int> maskPixels;   // indici piatti dei pixel selezionati
  final double avgHue;
  final double avgSaturation;
  final double avgValue;
  final ({int x, int y, int width, int height}) bounds;
}

class ColorEditor {
  ColorEditor(this._imagePath);
  final String _imagePath;

  img.Image? _image;
  final List<Uint8List> _undoStack = [];
  static const _maxUndo = 10;

  Future<img.Image> load() async {
    final bytes = await File(_imagePath).readAsBytes();
    _image = img.decodeImage(bytes)!;
    return _image!;
  }

  /// Flood fill HSV a partire dal pixel (px, py) con le tolleranze date.
  Future<ColorSelection?> seleziona(
    int px,
    int py, {
    double tolH = 15,
    double tolS = 0.30,
    double tolV = 0.40,
  }) async {
    if (_image == null) return null;
    return compute(_floodFill, _FloodFillParams(
      width: _image!.width,
      height: _image!.height,
      pixels: _image!.getBytes(),
      startX: px,
      startY: py,
      tolH: tolH,
      tolS: tolS,
      tolV: tolV,
    ));
  }

  /// Applica il cambio colore mantenendo luminosità e texture originali.
  Future<img.Image> applicaColore(
    ColorSelection selection,
    double targetHue,          // 0–360
    double targetSaturation,   // 0–1
  ) async {
    if (_image == null) throw StateError('Immagine non caricata');
    _pushUndo();

    final result = await compute(_applyColor, _ApplyColorParams(
      width: _image!.width,
      height: _image!.height,
      pixels: Uint8List.fromList(_image!.getBytes()),
      maskPixels: selection.maskPixels,
      avgSaturation: selection.avgSaturation,
      targetHue: targetHue,
      targetSaturation: targetSaturation,
    ));

    _image = img.Image.fromBytes(
      width: _image!.width,
      height: _image!.height,
      bytes: result.buffer,
    );
    return _image!;
  }

  void _pushUndo() {
    if (_undoStack.length >= _maxUndo) _undoStack.removeAt(0);
    _undoStack.add(Uint8List.fromList(_image!.getBytes()));
  }

  bool get canUndo => _undoStack.isNotEmpty;

  img.Image? undo() {
    if (_undoStack.isEmpty || _image == null) return null;
    final bytes = _undoStack.removeLast();
    _image = img.Image.fromBytes(
      width: _image!.width,
      height: _image!.height,
      bytes: bytes.buffer,
    );
    return _image;
  }

  Future<void> salva(String outputPath) async {
    if (_image == null) return;
    final encoded = img.encodeJpg(_image!, quality: 92);
    await File(outputPath).writeAsBytes(encoded);
  }
}

// ─── Isolate helpers ────────────────────────────────────────────────────────

class _FloodFillParams {
  const _FloodFillParams({
    required this.width,
    required this.height,
    required this.pixels,
    required this.startX,
    required this.startY,
    required this.tolH,
    required this.tolS,
    required this.tolV,
  });
  final int width, height, startX, startY;
  final Uint8List pixels;
  final double tolH, tolS, tolV;
}

ColorSelection _floodFill(_FloodFillParams p) {
  final w = p.width;
  final h = p.height;
  final pix = p.pixels;

  List<double> _rgbToHsv(int r, int g, int b) {
    final rf = r / 255, gf = g / 255, bf = b / 255;
    final max = math.max(rf, math.max(gf, bf));
    final min = math.min(rf, math.min(gf, bf));
    final delta = max - min;
    double hue = 0;
    if (delta != 0) {
      if (max == rf) hue = 60 * ((gf - bf) / delta % 6);
      else if (max == gf) hue = 60 * ((bf - rf) / delta + 2);
      else hue = 60 * ((rf - gf) / delta + 4);
      if (hue < 0) hue += 360;
    }
    return [hue, max == 0 ? 0 : delta / max, max];
  }

  int idx(int x, int y) => (y * w + x) * 4;

  final startIdx = idx(p.startX, p.startY);
  final seedHsv = _rgbToHsv(pix[startIdx], pix[startIdx + 1], pix[startIdx + 2]);

  final visited = <int>{};
  final queue = <(int, int)>[(p.startX, p.startY)];
  int minX = p.startX, maxX = p.startX, minY = p.startY, maxY = p.startY;
  double sumH = 0, sumS = 0, sumV = 0;

  while (queue.isNotEmpty) {
    final (x, y) = queue.removeLast();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    final flat = y * w + x;
    if (visited.contains(flat)) continue;

    final i = flat * 4;
    final hsv = _rgbToHsv(pix[i], pix[i + 1], pix[i + 2]);
    final dH = (hsv[0] - seedHsv[0]).abs();
    final circularDH = dH > 180 ? 360 - dH : dH;
    if (circularDH > p.tolH || (hsv[1] - seedHsv[1]).abs() > p.tolS || (hsv[2] - seedHsv[2]).abs() > p.tolV) continue;

    visited.add(flat);
    sumH += hsv[0]; sumS += hsv[1]; sumV += hsv[2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;

    queue.addAll([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]);
  }

  final n = visited.length;
  return ColorSelection(
    maskPixels: visited,
    avgHue: n > 0 ? sumH / n : seedHsv[0],
    avgSaturation: n > 0 ? sumS / n : seedHsv[1],
    avgValue: n > 0 ? sumV / n : seedHsv[2],
    bounds: (x: minX, y: minY, width: maxX - minX, height: maxY - minY),
  );
}

class _ApplyColorParams {
  const _ApplyColorParams({
    required this.width,
    required this.height,
    required this.pixels,
    required this.maskPixels,
    required this.avgSaturation,
    required this.targetHue,
    required this.targetSaturation,
  });
  final int width, height;
  final Uint8List pixels;
  final Set<int> maskPixels;
  final double avgSaturation, targetHue, targetSaturation;
}

Uint8List _applyColor(_ApplyColorParams p) {
  final out = Uint8List.fromList(p.pixels);

  List<int> _hsvToRgb(double h, double s, double v) {
    final c = v * s;
    final x = c * (1 - ((h / 60) % 2 - 1).abs());
    final m = v - c;
    double r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [((r + m) * 255).round(), ((g + m) * 255).round(), ((b + m) * 255).round()];
  }

  for (final flat in p.maskPixels) {
    final i = flat * 4;
    final r = out[i], g = out[i + 1], b = out[i + 2];
    final rf = r / 255, gf = g / 255, bf = b / 255;
    final maxC = math.max(rf, math.max(gf, bf));
    final minC = math.min(rf, math.min(gf, bf));
    final origV = maxC;
    final origS = maxC == 0 ? 0.0 : (maxC - minC) / maxC;

    // Scala saturazione in modo relativo, mantiene valore (luminosità)
    final newS = (origS * (p.targetSaturation / (p.avgSaturation.clamp(0.01, 1.0)))).clamp(0.0, 1.0);
    final rgb = _hsvToRgb(p.targetHue, newS, origV);
    out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2];
  }
  return out;
}
