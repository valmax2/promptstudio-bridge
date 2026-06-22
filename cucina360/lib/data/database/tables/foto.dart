import 'package:drift/drift.dart';
import 'progetti.dart';

@DataClassName('FotoData')
class Foto extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  TextColumn get filePath => text()();
  IntColumn get ordine => integer()();
  RealColumn get orientamentoGradi => real().withDefault(const Constant(0))();
  DateTimeColumn get timestamp => dateTime()();
}
