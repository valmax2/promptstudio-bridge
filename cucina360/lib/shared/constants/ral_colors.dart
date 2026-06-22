import 'package:flutter/material.dart';

class RalColor {
  const RalColor(this.code, this.name, this.hex);
  final String code;
  final String name;
  final int hex;

  Color get color => Color(hex);
  double get hue => HSVColor.fromColor(Color(hex)).hue;
  double get saturation => HSVColor.fromColor(Color(hex)).saturation;
}

/// Palette RAL classica — colori più usati per cucine
const ralColors = [
  // Bianchi e neutri chiari
  RalColor('RAL 9010', 'Bianco Puro', 0xFFF4F4F4),
  RalColor('RAL 9016', 'Bianco Traffico', 0xFFF6F6F6),
  RalColor('RAL 9003', 'Bianco Segnale', 0xFFF0F0F0),
  RalColor('RAL 9001', 'Bianco Crema', 0xFFF4ECD8),
  RalColor('RAL 1013', 'Bianco Perla', 0xFFEAE0CA),
  RalColor('RAL 1015', 'Avorio Chiaro', 0xFFE8DCBC),

  // Grigi
  RalColor('RAL 7016', 'Grigio Antracite', 0xFF293133),
  RalColor('RAL 7021', 'Grigio Nero', 0xFF212625),
  RalColor('RAL 7035', 'Grigio Luce', 0xFFCBCDCC),
  RalColor('RAL 7037', 'Grigio Polvere', 0xFF7D7E7B),
  RalColor('RAL 7040', 'Grigio Finestra', 0xFF9FA0A2),
  RalColor('RAL 7044', 'Grigio Seta', 0xFFB6B5A8),
  RalColor('RAL 7047', 'Grigio Telemagra', 0xFFD0CFCE),

  // Neri
  RalColor('RAL 9005', 'Nero Profondo', 0xFF0A0A0A),
  RalColor('RAL 9011', 'Nero Grafite', 0xFF1C1C1C),
  RalColor('RAL 9004', 'Nero Segnale', 0xFF282828),

  // Verdi
  RalColor('RAL 6021', 'Verde Pallido', 0xFF86A47C),
  RalColor('RAL 6024', 'Verde Traffico', 0xFF308446),
  RalColor('RAL 6025', 'Verde Felce', 0xFF4E6B3B),
  RalColor('RAL 6034', 'Turchese Pastello', 0xFF7DC0B4),

  // Blu
  RalColor('RAL 5000', 'Blu Violaceo', 0xFF354D73),
  RalColor('RAL 5008', 'Blu Grigio', 0xFF374152),
  RalColor('RAL 5011', 'Blu Acciaio', 0xFF232C3B),
  RalColor('RAL 5024', 'Blu Pastello', 0xFF6490A8),

  // Beige e marroni
  RalColor('RAL 1019', 'Beige Grigio', 0xFF9E8E78),
  RalColor('RAL 1020', 'Giallo Oliva', 0xFF989168),
  RalColor('RAL 8014', 'Marrone Seppia', 0xFF4B3325),
  RalColor('RAL 8019', 'Marrone Grigio', 0xFF403735),
  RalColor('RAL 8022', 'Marrone Nero', 0xFF1A1110),

  // Rossi e bordeaux
  RalColor('RAL 3005', 'Rosso Vino', 0xFF5B2026),
  RalColor('RAL 3009', 'Rosso Ossido', 0xFF6B3230),
  RalColor('RAL 3016', 'Rosso Corallo', 0xFFAA4238),

  // Gialli e senape
  RalColor('RAL 1002', 'Giallo Sabbia', 0xFFD4B84A),
  RalColor('RAL 1012', 'Giallo Limone', 0xFFDBB831),
  RalColor('RAL 1006', 'Giallo Mais', 0xFFE6A817),

  // Colori premium (sbloccati con Pro)
  RalColor('RAL 6003', 'Verde Oliva', 0xFF4B5A3C),
  RalColor('RAL 6018', 'Verde Giallastro', 0xFF5A8439),
  RalColor('RAL 5015', 'Blu Cielo', 0xFF1B6CA8),
  RalColor('RAL 4009', 'Viola Pastello', 0xFF9C8FB3),
  RalColor('RAL 3022', 'Rosso Salmone', 0xFFD86F5B),
];

// I primi 20 sono disponibili nella versione gratuita
const int ralFreeLimit = 20;
