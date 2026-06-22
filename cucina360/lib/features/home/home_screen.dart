import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/purchase/purchase_service.dart';
import '../../data/database/app_database.dart';
import '../../data/repository/progetto_repository.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/paywall_sheet.dart';
import '../../app/theme.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progettiStream = ref.watch(progettiStreamProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cucina 360°',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _mostraInfo(context),
          ),
        ],
      ),
      body: progettiStream.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Errore: $e')),
        data: (progetti) => progetti.isEmpty
            ? _EmptyState(onCrea: () => _nuovoProgetto(context, ref))
            : _ProgettiGrid(progetti: progetti),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _nuovoProgetto(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Nuovo progetto'),
      ),
    );
  }

  Future<void> _nuovoProgetto(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(progettoRepositoryProvider);
    final isPremium = ref.read(isPremiumProvider);

    if (!isPremium) {
      final count = await repo.contaProgetti();
      if (count >= 2) {
        if (context.mounted) {
          // ignore: use_build_context_synchronously
          await PaywallSheet.show(context);
        }
        return;
      }
    }

    if (!context.mounted) return;
    final nome = await _dialogNome(context);
    if (nome == null || nome.isEmpty) return;

    final progetto = await repo.creaProgetto(nome);
    if (context.mounted) {
      context.pushNamed('camera', pathParameters: {'id': '${progetto.id}'});
    }
  }

  Future<String?> _dialogNome(BuildContext context) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Nome progetto'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'es. Cucina soggiorno'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Crea'),
          ),
        ],
      ),
    );
  }

  void _mostraInfo(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'Cucina 360°',
      applicationVersion: '1.0.0',
      applicationLegalese: '© 2025',
    );
  }
}

// ── Provider ────────────────────────────────────────────────────────────────

final progettiStreamProvider = StreamProvider<List<Progetto>>((ref) {
  return ref.watch(progettoRepositoryProvider).watchAll();
});

// ── Widget privati ───────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCrea});
  final VoidCallback onCrea;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🏠', style: TextStyle(fontSize: 56)),
          const SizedBox(height: 16),
          const Text('Nessun progetto ancora',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Scatta le foto della tua cucina\ne visualizzala in 360°',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: onCrea,
            icon: const Icon(Icons.add),
            label: const Text('Crea il tuo primo progetto'),
          ),
        ],
      ),
    );
  }
}

class _ProgettiGrid extends ConsumerWidget {
  const _ProgettiGrid({required this.progetti});
  final List<Progetto> progetti;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: progetti.length,
      itemBuilder: (_, i) => _ProgettoCard(progetto: progetti[i]),
    );
  }
}

class _ProgettoCard extends ConsumerWidget {
  const _ProgettoCard({required this.progetto});
  final Progetto progetto;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fmt = DateFormat('dd/MM/yyyy');

    return AppCard(
      onTap: () {
        if (progetto.panoramaPath != null) {
          context.pushNamed('viewer',
              pathParameters: {'id': '${progetto.id}'},
              extra: progetto.panoramaPath!);
        } else {
          context.pushNamed('camera',
              pathParameters: {'id': '${progetto.id}'});
        }
      },
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: progetto.thumbnailPath != null
                  ? Image.asset(progetto.thumbnailPath!, fit: BoxFit.cover,
                      width: double.infinity)
                  : Container(
                      color: AppColors.border,
                      child: const Center(
                        child: Icon(Icons.panorama_photosphere,
                            color: AppColors.textSecondary, size: 40),
                      ),
                    ),
            ),
          ),
          // Info
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(progetto.nome,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(fmt.format(progetto.dataCreazione),
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
