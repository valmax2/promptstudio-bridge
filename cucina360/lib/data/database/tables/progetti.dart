import 'package:drift/drift.dart';

@DataClassName('Progetto')
class Progetti extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get nome => text().withLength(min: 1, max: 100)();
  DateTimeColumn get dataCreazione => dateTime()();
  TextColumn get thumbnailPath => text().nullable()();
  TextColumn get panoramaPath => text().nullable()();
}
