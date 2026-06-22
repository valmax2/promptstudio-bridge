import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

const _kPremiumId = 'cucina360_premium_unlock';

enum PurchaseState { unknown, free, pending, premium }

class PurchaseService extends ChangeNotifier {
  PurchaseState _state = PurchaseState.unknown;
  StreamSubscription<List<PurchaseDetails>>? _sub;

  PurchaseState get state => _state;
  bool get isPremium => _state == PurchaseState.premium;

  Future<void> init() async {
    final available = await InAppPurchase.instance.isAvailable();
    if (!available) {
      _state = PurchaseState.free;
      notifyListeners();
      return;
    }

    _sub = InAppPurchase.instance.purchaseStream.listen(_onPurchaseUpdate);

    // Ripristina acquisti precedenti
    await InAppPurchase.instance.restorePurchases();
  }

  void _onPurchaseUpdate(List<PurchaseDetails> purchases) {
    for (final purchase in purchases) {
      if (purchase.productID != _kPremiumId) continue;

      if (purchase.status == PurchaseStatus.purchased ||
          purchase.status == PurchaseStatus.restored) {
        _state = PurchaseState.premium;
        notifyListeners();
        if (purchase.pendingCompletePurchase) {
          InAppPurchase.instance.completePurchase(purchase);
        }
      } else if (purchase.status == PurchaseStatus.pending) {
        _state = PurchaseState.pending;
        notifyListeners();
      } else if (purchase.status == PurchaseStatus.error) {
        _state = PurchaseState.free;
        notifyListeners();
      }
    }
  }

  Future<void> acquistaPremium() async {
    final response = await InAppPurchase.instance
        .queryProductDetails({_kPremiumId});
    if (response.productDetails.isEmpty) return;

    final param = PurchaseParam(
      productDetails: response.productDetails.first,
    );
    await InAppPurchase.instance.buyNonConsumable(purchaseParam: param);
  }

  Future<void> ripristinaAcquisti() async {
    await InAppPurchase.instance.restorePurchases();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

// ChangeNotifierProvider propaga automaticamente notifyListeners() a Riverpod
final purchaseServiceProvider = ChangeNotifierProvider<PurchaseService>((ref) {
  throw UnimplementedError('Override in main()');
});

final isPremiumProvider = Provider<bool>((ref) {
  return ref.watch(purchaseServiceProvider).isPremium;
});
