import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image/image.dart' as img;

import '../../core/vision/color_editor.dart';
import '../../data/repository/progetto_repository.dart';
import '../../shared/constants/ral_colors.dart';
import '../../shared/widgets/paywall_sheet.dart';
import '../../app/theme.dart';

class EditorScreen extends ConsumerStatefulWidget {
  const EditorScreen({
    super.key,
    required this.progettoId,
    required this.panoramaPath,
  });
  final int progettoId;
  final String panoramaPath;

  @override
  ConsumerState<EditorScreen> createState() => _EditorScreenState();
}

class _EditorScreenState extends ConsumerState<EditorScreen> {
  late final ColorEditor _editor;
  img.Image? _image;
  ColorSelection? _selection;
  bool _loading = true;
  bool _processing = false;
  RalColor? _coloreSelezionato;

  @override
  void initState() {
    super.initState();
    _editor = ColorEditor(widget.panoramaPath);
    _caricaImmagine();
  }

  Future<void> _caricaImmagine() async {
    final image = await _editor.load();
    if (mounted) setState(() { _image = image; _loading = false; });
  }

  Future<void> _onTap(TapDownDetails details, Size widgetSize) async {
    if (_image == null || _processing) return;
    final px = (details.localPosition.dx / widgetSize.width * _image!.width).round();
    final py = (details.localPosition.dy / widgetSize.height * _image!.height).round();

    setState(() => _processing = true);
    final selection = await _editor.seleziona(px, py);
    setState(() { _selection = selection; _processing = false; });

    if (selection != null && mounted) _mostraPaletteSheet();
  }

  void _mostraPaletteSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _PaletteSheet(
        onColorSelected: _applicaColore,
        isPremium: ref.read(isPremiumProvider),
        onPaywall: () => PaywallSheet.show(context),
      ),
    );
  }

  Future<void> _applicaColore(RalColor ral) async {
    if (_selection == null || _processing) return;
    Navigator.pop(context); // chiudi sheet
    setState(() => _processing = true);
    final newImage = await _editor.applicaColore(_selection!, ral.hue, ral.saturation);
    setState(() { _image = newImage; _coloreSelezionato = ral; _processing = false; });
  }

  Future<void> _salva() async {
    if (_image == null) return;
    setState(() => _processing = true);
    final outputPath = widget.panoramaPath.replaceAll('.jpg', '_edited.jpg');
    await _editor.salva(outputPath);

    final repo = ref.read(progettoRepositoryProvider);
    await repo.salvaVersioneColore(
      progettoId: widget.progettoId,
      descrizione: _coloreSelezionato != null
          ? '${_coloreSelezionato!.code} — ${_coloreSelezionato!.name}'
          : 'Versione personalizzata',
      parametriJson: '{}',
      anteprimaPath: outputPath,
    );

    setState(() => _processing = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Versione salvata'), backgroundColor: AppColors.primary),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Editor Colori'),
        actions: [
          if (_editor.canUndo)
            IconButton(
              onPressed: () => setState(() => _editor.undo()),
              icon: const Icon(Icons.undo),
            ),
          IconButton(
            onPressed: _image != null ? _salva : null,
            icon: const Icon(Icons.save_outlined),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                Column(
                  children: [
                    // Istruzione
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      color: AppColors.surface,
                      child: Row(
                        children: [
                          const Icon(Icons.touch_app,
                              color: AppColors.primary, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            _selection == null
                                ? 'Tocca una superficie per cambiarle il colore'
                                : 'Superficie selezionata — scegli un colore',
                            style: const TextStyle(
                                color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                    ),

                    // Immagine interattiva
                    Expanded(
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final size = Size(constraints.maxWidth, constraints.maxHeight);
                          return GestureDetector(
                            onTapDown: (d) => _onTap(d, size),
                            child: _image != null
                                ? Image.memory(
                                    img.encodeJpg(_image!) as dynamic,
                                    fit: BoxFit.contain,
                                    width: double.infinity,
                                    height: double.infinity,
                                  )
                                : const SizedBox.shrink(),
                          );
                        },
                      ),
                    ),

                    // Colore attivo
                    if (_coloreSelezionato != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        color: AppColors.surface,
                        child: Row(
                          children: [
                            Container(
                              width: 24, height: 24,
                              decoration: BoxDecoration(
                                color: _coloreSelezionato!.color,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.border),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              '${_coloreSelezionato!.code} — ${_coloreSelezionato!.name}',
                              style: const TextStyle(fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),

                if (_processing)
                  const ColoredBox(
                    color: Colors.black45,
                    child: Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
    );
  }
}

// ── Palette sheet ────────────────────────────────────────────────────────────

class _PaletteSheet extends StatelessWidget {
  const _PaletteSheet({
    required this.onColorSelected,
    required this.isPremium,
    required this.onPaywall,
  });
  final ValueChanged<RalColor> onColorSelected;
  final bool isPremium;
  final VoidCallback onPaywall;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      maxChildSize: 0.9,
      minChildSize: 0.35,
      expand: false,
      builder: (_, controller) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                const Text('Palette RAL',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const Spacer(),
                if (!isPremium)
                  TextButton.icon(
                    onPressed: onPaywall,
                    icon: const Icon(Icons.lock_open_outlined, size: 14),
                    label: const Text('Sblocca tutto', style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              controller: controller,
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.8,
              ),
              itemCount: ralColors.length,
              itemBuilder: (_, i) {
                final ral = ralColors[i];
                final bloccato = !isPremium && i >= ralFreeLimit;
                return GestureDetector(
                  onTap: bloccato ? onPaywall : () => onColorSelected(ral),
                  child: Column(
                    children: [
                      Expanded(
                        child: Stack(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                color: bloccato
                                    ? ral.color.withOpacity(0.3)
                                    : ral.color,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.border),
                              ),
                            ),
                            if (bloccato)
                              const Center(
                                child: Icon(Icons.lock,
                                    color: Colors.white54, size: 14),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        ral.code.replaceFirst('RAL ', ''),
                        style: const TextStyle(
                            fontSize: 9, color: AppColors.textSecondary),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
