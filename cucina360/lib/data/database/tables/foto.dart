import 'package:drift/drift.dart';
import 'progetti.dart';

// Drift genera la classe row come "FotoData" dato che la table class è "Foto"
class Foto extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  TextColumn get filePath => text()();
  IntColumn get ordine => integer()();
  RealColumn get orientamentoGradi => real().withDefault(const Constant(0))();
  DateTimeColumn get timestamp => dateTime()();
}
