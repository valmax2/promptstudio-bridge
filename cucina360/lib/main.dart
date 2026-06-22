import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;

import 'app/app.dart';
import 'data/database/app_database.dart';
import 'core/purchase/purchase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  final db = AppDatabase();
  final purchaseService = PurchaseService();
  await purchaseService.init();

  runApp(
    ProviderScope(
      overrides: [
        appDatabaseProvider.overrideWithValue(db),
        purchaseServiceProvider.overrideWith((ref) => purchaseService),
      ],
      child: const Cucina360App(),
    ),
  );
}
