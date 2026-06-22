import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/vision/stitching_engine.dart';
import '../../data/repository/progetto_repository.dart';
import '../../app/theme.dart';

class StitchingScreen extends ConsumerStatefulWidget {
  const StitchingScreen({
    super.key,
    required this.progettoId,
    required this.fotoPaths,
  });
  final int progettoId;
  final List<String> fotoPaths;

  @override
  ConsumerState<StitchingScreen> createState() => _StitchingScreenState();
}

class _StitchingScreenState extends ConsumerState<StitchingScreen> {
  StitchingState _state = const StitchingIdle();

  @override
  void initState() {
    super.initState();
    _avviaStitching();
  }

  Future<void> _avviaStitching() async {
    final engine = StitchingEngine();
    await for (final state in engine.assembla(widget.fotoPaths, widget.progettoId)) {
      if (!mounted) return;
      setState(() => _state = state);

      if (state is StitchingSuccess) {
        final repo = ref.read(progettoRepositoryProvider);
        await repo.aggiornaPanorama(
            widget.progettoId, state.panoramaPath, state.panoramaPath);
        if (mounted) {
          await Future.delayed(const Duration(milliseconds: 600));
          context.pushReplacementNamed('viewer',
              pathParameters: {'id': '${widget.progettoId}'},
              extra: state.panoramaPath);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: switch (_state) {
            StitchingIdle() => const CircularProgressIndicator(),
            StitchingProcessing(progress: var p, step: var s) =>
              _ProgressView(progress: p, step: s, fotoCount: widget.fotoPaths.length),
            StitchingSuccess() => _SuccessView(),
            StitchingError(message: var msg) => _ErrorView(
                message: msg,
                onRetry: () {
                  setState(() => _state = const StitchingIdle());
                  _avviaStitching();
                },
              ),
          },
        ),
      ),
    );
  }
}

class _ProgressView extends StatelessWidget {
  const _ProgressView({
    required this.progress,
    required this.step,
    required this.fotoCount,
  });
  final int progress, fotoCount;
  final String step;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Assemblaggio panoramica',
            style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 6),
        Text('$fotoCount foto in elaborazione',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 32),
        LinearProgressIndicator(
          value: progress / 100,
          backgroundColor: AppColors.border,
          color: AppColors.primary,
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(step,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            Text('$progress%',
                style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 24),
        const Text('Rimani su questa schermata',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
      ],
    );
  }
}

class _SuccessView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle_rounded,
            color: AppColors.primary, size: 56),
        const SizedBox(height: 16),
        const Text('Panoramica pronta!',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Apertura viewer…',
            style: TextStyle(color: AppColors.textSecondary)),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.error_outline, color: AppColors.error, size: 48),
        const SizedBox(height: 16),
        const Text('Stitching fallito',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: const Text('Riprova'),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Torna alla fotocamera'),
        ),
      ],
    );
  }
}
