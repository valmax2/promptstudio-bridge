import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/purchase/purchase_service.dart';
import '../app/theme.dart';

class PaywallSheet extends ConsumerWidget {
  const PaywallSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const PaywallSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final purchase = ref.watch(purchaseServiceProvider);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Sblocca Cucina 360° Pro',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Una tantum — nessun abbonamento',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 20),
            ..._features.map((f) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(children: [
                const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 18),
                const SizedBox(width: 10),
                Text(f, style: const TextStyle(fontSize: 14)),
              ]),
            )),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => purchase.acquistaPremium(),
                child: const Text('Acquista ora — 5,99 €'),
              ),
            ),
            const SizedBox(height: 10),
            Center(
              child: TextButton(
                onPressed: () => purchase.ripristinaAcquisti(),
                child: Text('Ripristina acquisti',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

const _features = [
  'Progetti illimitati (free: max 2)',
  'Fino a 20 foto per panoramica (free: max 8)',
  'Palette RAL completa — 200+ colori',
  'Export full resolution senza watermark',
  'Storico versioni colore illimitato',
  'Funzione Condividi (JPEG/PNG)',
];
