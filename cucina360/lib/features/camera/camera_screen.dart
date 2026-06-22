import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'dart:math' as math;

import '../../core/purchase/purchase_service.dart';
import '../../data/repository/progetto_repository.dart';
import '../../app/theme.dart';

const int _minFoto = 6;
const int _maxFotoFree = 8;
const int _maxFotoPro = 20;

class CameraScreen extends ConsumerStatefulWidget {
  const CameraScreen({super.key, required this.progettoId});
  final int progettoId;

  @override
  ConsumerState<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends ConsumerState<CameraScreen> {
  CameraController? _ctrl;
  List<String> _fotoPaths = [];
  double _orientamento = 0;
  bool _scattando = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
    accelerometerEventStream().listen((e) {
      final angolo = math.atan2(e.x, e.y) * (180 / math.pi);
      if (mounted) setState(() => _orientamento = angolo);
    });
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;
    _ctrl = CameraController(cameras.first, ResolutionPreset.max,
        imageFormatGroup: ImageFormatGroup.jpeg);
    await _ctrl!.initialize();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  Future<void> _scatta() async {
    if (_ctrl == null || !_ctrl!.value.isInitialized || _scattando) return;
    final isPremium = ref.read(isPremiumProvider);
    final maxFoto = isPremium ? _maxFotoPro : _maxFotoFree;
    if (_fotoPaths.length >= maxFoto) return;

    setState(() => _scattando = true);
    try {
      final repo = ref.read(progettoRepositoryProvider);
      final path = await repo.nuovoFotoPath(widget.progettoId);
      final file = await _ctrl!.takePicture();
      await File(file.path).copy(path);

      await repo.salvaFoto(
        progettoId: widget.progettoId,
        filePath: path,
        ordine: _fotoPaths.length,
        orientamento: _orientamento,
      );

      setState(() => _fotoPaths.add(path));
    } finally {
      setState(() => _scattando = false);
    }
  }

  void _assembla() {
    context.pushNamed('stitching',
        pathParameters: {'id': '${widget.progettoId}'},
        extra: List<String>.from(_fotoPaths));
  }

  @override
  Widget build(BuildContext context) {
    final isPremium = ref.read(isPremiumProvider);
    final maxFoto = isPremium ? _maxFotoPro : _maxFotoFree;
    final prontoPerAssemblare = _fotoPaths.length >= _minFoto;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Preview camera
          if (_ctrl?.value.isInitialized == true)
            CameraPreview(_ctrl!)
          else
            const Center(child: CircularProgressIndicator()),

          // Overlay bussola direzionale
          Positioned(
            top: 60, left: 0, right: 0,
            child: _CompassOverlay(
              angolo: _orientamento,
              fotoScattate: _fotoPaths.length,
              maxFoto: maxFoto,
            ),
          ),

          // Thumbnail strip in basso a sinistra
          if (_fotoPaths.isNotEmpty)
            Positioned(
              bottom: 120, left: 12,
              child: _ThumbnailStrip(paths: _fotoPaths),
            ),

          // Pulsanti in basso
          Positioned(
            bottom: 40, left: 0, right: 0,
            child: _BottomBar(
              onScatta: _scattando ? null : _scatta,
              onAssembla: prontoPerAssemblare ? _assembla : null,
              fotoCount: _fotoPaths.length,
              minFoto: _minFoto,
              scattando: _scattando,
            ),
          ),

          // Back button
          Positioned(
            top: 56, left: 12,
            child: IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              style: IconButton.styleFrom(backgroundColor: Colors.black45),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Overlay bussola ──────────────────────────────────────────────────────────

class _CompassOverlay extends StatelessWidget {
  const _CompassOverlay({
    required this.angolo,
    required this.fotoScattate,
    required this.maxFoto,
  });
  final double angolo;
  final int maxFoto;
  final int fotoScattate;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.black54,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                Transform.rotate(
                  angle: angolo * math.pi / 180,
                  child: const Icon(Icons.navigation,
                      color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 8),
                Text('${angolo.toStringAsFixed(0)}°',
                    style: const TextStyle(color: Colors.white, fontSize: 13)),
              ]),
              Text('$fotoScattate / $maxFoto foto',
                  style: TextStyle(
                    color: fotoScattate >= 6 ? AppColors.primary : Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  )),
            ],
          ),
        ),
        if (fotoScattate < 6)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Ruota il telefono e scatta da angoli diversi',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.7), fontSize: 12),
            ),
          ),
      ],
    );
  }
}

// ── Thumbnail strip ──────────────────────────────────────────────────────────

class _ThumbnailStrip extends StatelessWidget {
  const _ThumbnailStrip({required this.paths});
  final List<String> paths;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: paths.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (_, i) => ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.file(File(paths[i]),
              width: 56, height: 56, fit: BoxFit.cover),
        ),
      ),
    );
  }
}

// ── Bottom bar ───────────────────────────────────────────────────────────────

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.onScatta,
    required this.onAssembla,
    required this.fotoCount,
    required this.minFoto,
    required this.scattando,
  });
  final VoidCallback? onScatta, onAssembla;
  final int fotoCount, minFoto;
  final bool scattando;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Placeholder sinistra per simmetria
        const SizedBox(width: 80),

        // Pulsante scatto
        GestureDetector(
          onTap: onScatta,
          child: Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              color: scattando ? Colors.white38 : Colors.white24,
            ),
            child: scattando
                ? const Center(
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const SizedBox.shrink(),
          ),
        ),

        // Pulsante assembla
        SizedBox(
          width: 80,
          child: onAssembla != null
              ? TextButton(
                  onPressed: onAssembla,
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, color: AppColors.primary),
                      SizedBox(height: 2),
                      Text('Assembla',
                          style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.auto_awesome, color: Colors.white30),
                    const SizedBox(height: 2),
                    Text('min $minFoto foto',
                        style: const TextStyle(
                            color: Colors.white30, fontSize: 10)),
                  ],
                ),
        ),
      ],
    );
  }
}
