import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables/progetti.dart';
import 'tables/foto.dart';
import 'tables/versioni_colore.dart';

export 'tables/progetti.dart';
export 'tables/foto.dart';
export 'tables/versioni_colore.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Progetti, Foto, VersioniColore])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // ── Progetti ──────────────────────────────────────────────────────────────

  Stream<List<Progetto>> watchAllProgetti() =>
      (select(progetti)..orderBy([(p) => OrderingTerm.desc(p.dataCreazione)])).watch();

  Future<Progetto> getProgetto(int id) =>
      (select(progetti)..where((p) => p.id.equals(id))).getSingle();

  Future<int> insertProgetto(ProgettiCompanion data) =>
      into(progetti).insert(data);

  Future<void> updateProgetto(ProgettiCompanion data) =>
      (update(progetti)..where((p) => p.id.equals(data.id.value))).write(data);

  Future<void> deleteProgetto(int id) async {
    await (delete(foto)..where((f) => f.progettoId.equals(id))).go();
    await (delete(versioniColore)..where((v) => v.progettoId.equals(id))).go();
    await (delete(progetti)..where((p) => p.id.equals(id))).go();
  }

  Future<int> countProgetti() async {
    final count = progetti.id.count();
    final query = selectOnly(progetti)..addColumns([count]);
    final result = await query.getSingle();
    return result.read(count) ?? 0;
  }

  // ── Foto ──────────────────────────────────────────────────────────────────

  Future<List<FotoRow>> getFotoPerProgetto(int progettoId) =>
      (select(foto)
            ..where((f) => f.progettoId.equals(progettoId))
            ..orderBy([(f) => OrderingTerm.asc(f.ordine)]))
          .get();

  Future<int> insertFoto(FotoCompanion data) => into(foto).insert(data);

  Future<void> deleteFotoProgetto(int progettoId) =>
      (delete(foto)..where((f) => f.progettoId.equals(progettoId))).go();

  // ── Versioni Colore ───────────────────────────────────────────────────────

  Stream<List<VersioneColore>> watchVersioniPerProgetto(int progettoId) =>
      (select(versioniColore)
            ..where((v) => v.progettoId.equals(progettoId))
            ..orderBy([(v) => OrderingTerm.desc(v.timestamp)]))
          .watch();

  Future<int> insertVersioneColore(VersioniColoreCompanion data) =>
      into(versioniColore).insert(data);

  Future<int> countVersioniColore(int progettoId) async {
    final count = versioniColore.id.count();
    final query = selectOnly(versioniColore)
      ..addColumns([count])
      ..where(versioniColore.progettoId.equals(progettoId));
    final result = await query.getSingle();
    return result.read(count) ?? 0;
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'cucina360.db'));
    return NativeDatabase.createInBackground(file);
  });
}

// Provider globale del database
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  throw UnimplementedError('Override in main()');
});
