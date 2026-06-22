import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Converte i dati del giroscopio/accelerometro in angoli di rotazione
/// (yaw, pitch) per orientare il viewer 360°.
class SensorHelper {
  SensorHelper() {
    _init();
  }

  double _yaw = 0;    // rotazione orizzontale (sinistra/destra)
  double _pitch = 0;  // rotazione verticale (su/giù)

  double get yaw => _yaw;
  double get pitch => _pitch;

  // Target per interpolazione smooth
  double _targetYaw = 0;
  double _targetPitch = 0;

  // Offset iniziale (calibrazione al primo frame)
  double? _yawOffset;
  double? _pitchOffset;

  final ValueNotifier<({double yaw, double pitch})> rotation =
      ValueNotifier((yaw: 0, pitch: 0));

  void _init() {
    // Usa il vettore di rotazione che fonde già giroscopio + accelerometro
    accelerometerEventStream().listen(_onAccelerometer);
    gyroscopeEventStream().listen(_onGyroscope);
  }

  void _onAccelerometer(AccelerometerEvent e) {
    // Calcola pitch dall'accelerometro (stabile a lungo termine)
    final pitch = math.atan2(-e.x, math.sqrt(e.y * e.y + e.z * e.z));
    _targetPitch = pitch.clamp(-math.pi / 2, math.pi / 2);
    _update();
  }

  void _onGyroscope(GyroscopeEvent e) {
    // Integra il giroscopio per yaw (rapido, ma con deriva nel tempo)
    _targetYaw += e.z * 0.016; // ~60fps, dt ≈ 16ms
    _update();
  }

  void _update() {
    // Calibra al primo aggiornamento
    _yawOffset ??= _targetYaw;
    _pitchOffset ??= _targetPitch;

    final calibratedYaw = _targetYaw - (_yawOffset ?? 0);
    final calibratedPitch = _targetPitch - (_pitchOffset ?? 0);

    // Interpolazione smooth (lerp fattore 0.12)
    _yaw = _lerp(_yaw, calibratedYaw, 0.12);
    _pitch = _lerp(_pitch, calibratedPitch, 0.12);

    rotation.value = (yaw: _yaw, pitch: _pitch);
  }

  double _lerp(double a, double b, double t) => a + (b - a) * t;

  void calibra() {
    _yawOffset = _targetYaw;
    _pitchOffset = _targetPitch;
  }

  void dispose() {
    rotation.dispose();
  }
}
