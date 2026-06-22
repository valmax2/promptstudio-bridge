import 'package:drift/drift.dart';
import 'progetti.dart';

@DataClassName('VersioneColore')
class VersioniColore extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get progettoId => integer().references(Progetti, #id)();
  DateTimeColumn get timestamp => dateTime()();
  TextColumn get descrizione => text().withDefault(const Constant(''))();
  // JSON: { "maskPath": "...", "hue": 120, "satScale": 1.0 }
  TextColumn get parametriJson => text()();
  TextColumn get anteprimaPath => text().nullable()();
}
