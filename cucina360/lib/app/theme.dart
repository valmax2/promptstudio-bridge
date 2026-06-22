import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const _bgColor = Color(0xFF0A0A0F);
const _surfaceColor = Color(0xFF14141C);
const _cardBorder = Color(0xFF1E1E2E);
const _primaryTeal = Color(0xFF00C9A7);
const _secondaryViolet = Color(0xFFA78BFA);
const _errorRed = Color(0xFFFF6B6B);
const _textPrimary = Color(0xFFF0F0F6);
const _textSecondary = Color(0xFF72728E);

ThemeData buildAppTheme() {
  final base = ThemeData.dark();
  return base.copyWith(
    scaffoldBackgroundColor: _bgColor,
    colorScheme: const ColorScheme.dark(
      primary: _primaryTeal,
      secondary: _secondaryViolet,
      error: _errorRed,
      surface: _surfaceColor,
      onPrimary: Colors.black,
      onSurface: _textPrimary,
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: _textPrimary,
      displayColor: _textPrimary,
    ),
    cardTheme: CardThemeData(
      color: _surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: _cardBorder),
      ),
      elevation: 0,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: _bgColor,
      foregroundColor: _textPrimary,
      elevation: 0,
      centerTitle: false,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primaryTeal,
        foregroundColor: Colors.black,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: _primaryTeal,
      foregroundColor: Colors.black,
    ),
    dividerColor: _cardBorder,
    iconTheme: const IconThemeData(color: _textSecondary),
  );
}

// Esporta i colori per usarli nei widget
class AppColors {
  const AppColors._();
  static const bg = _bgColor;
  static const surface = _surfaceColor;
  static const border = _cardBorder;
  static const primary = _primaryTeal;
  static const secondary = _secondaryViolet;
  static const error = _errorRed;
  static const textPrimary = _textPrimary;
  static const textSecondary = _textSecondary;
}
