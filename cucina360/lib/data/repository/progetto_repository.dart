import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';

class ProgettoRepository {
  ProgettoRepository(this._db);
  final AppDatabase _db;

  static const _uuid = Uuid();

  Stream<List<Progetto>> watchAll() => _db.watchAllProgetti();

  Future<Progetto> getById(int id) => _db.getProgetto(id);

  Future<Progetto> creaProgetto(String nome) async {
    final id = await _db.insertProgetto(
      ProgettiCompanion.insert(nome: nome, dataCreazione: DateTime.now()),
    );
    return _db.getProgetto(id);
  }

  Future<void> aggiornaPanorama(int progettoId, String panoramaPath, String thumbnailPath) {
    return _db.updateProgetto(ProgettiCompanion(
      id: Value(progettoId),
      panoramaPath: Value(panoramaPath),
      thumbnailPath: Value(thumbnailPath),
    ));
  }

  Future<void> eliminaProgetto(int id) => _db.deleteProgetto(id);

  Future<int> contaProgetti() => _db.countProgetti();

  // ── Foto ──────────────────────────────────────────────────────────────────

  Future<String> getFotoDirPath(int progettoId) async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, 'progetti', '$progettoId', 'foto'));
    await dir.create(recursive: true);
    return dir.path;
  }

  Future<String> nuovoFotoPath(int progettoId) async {
    final dir = await getFotoDirPath(progettoId);
    return p.join(dir, '${_uuid.v4()}.jpg');
  }

  Future<void> salvaFoto({
    required int progettoId,
    required String filePath,
    required int ordine,
    required double orientamento,
  }) {
    return _db.insertFoto(FotoCompanion.insert(
      progettoId: progettoId,
      filePath: filePath,
      ordine: ordine,
      orientamentoGradi: Value(orientamento),
      timestamp: DateTime.now(),
    ));
  }

  Future<List<FotoData>> getFoto(int progettoId) =>
      _db.getFotoPerProgetto(progettoId);

  // ── Versioni Colore ───────────────────────────────────────────────────────

  Stream<List<VersioneColore>> watchVersioni(int progettoId) =>
      _db.watchVersioniPerProgetto(progettoId);

  Future<void> salvaVersioneColore({
    required int progettoId,
    required String descrizione,
    required String parametriJson,
    String? anteprimaPath,
  }) {
    return _db.insertVersioneColore(VersioniColoreCompanion.insert(
      progettoId: progettoId,
      timestamp: DateTime.now(),
      descrizione: Value(descrizione),
      parametriJson: parametriJson,
      anteprimaPath: Value(anteprimaPath),
    ));
  }

  Future<int> contaVersioniColore(int progettoId) =>
      _db.countVersioniColore(progettoId);
}

final progettoRepositoryProvider = Provider<ProgettoRepository>((ref) {
  return ProgettoRepository(ref.watch(appDatabaseProvider));
});
