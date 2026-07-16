// Preset scoreboard color schemes. Chosen to stay readable on both tablets
// and phones - high contrast between the two halves and the white/black
// score text, avoiding pastel combinations that wash out on cheap phone
// panels ("colori sfasati").
export const COLOR_PRESETS = {
  classic: {
    label: 'Classico', teamAColor: '#1565C0', teamBColor: '#F2A900',
    numberColor: '#FFFFFF', numberBorderColor: '#000000', numberBorderWidth: 0,
  },
  padel: {
    label: 'Padel club', teamAColor: '#0E7C4A', teamBColor: '#E0501F',
    numberColor: '#FFFFFF', numberBorderColor: '#00000080', numberBorderWidth: 2,
  },
  night: {
    label: 'Notte', teamAColor: '#1A1F3D', teamBColor: '#3D1A3A',
    numberColor: '#7CFF6B', numberBorderColor: '#000000', numberBorderWidth: 0,
  },
  sunset: {
    label: 'Tramonto', teamAColor: '#C2410C', teamBColor: '#7C2D92',
    numberColor: '#FFFFFF', numberBorderColor: '#00000080', numberBorderWidth: 2,
  },
  highContrast: {
    label: 'Alto contrasto', teamAColor: '#000000', teamBColor: '#DC2626',
    numberColor: '#FFFFFF', numberBorderColor: '#FFFFFF', numberBorderWidth: 3,
  },
};

// Nearest common Italian color name for an arbitrary hex value - used to
// default a team's name to e.g. "Rosa" / "Verde" (matching its scoreboard
// color) instead of a generic "Squadra A/B" when no custom name is typed.
const NAMED_COLORS = [
  { name: 'Rosso', hex: '#E53935' },
  { name: 'Verde', hex: '#43A047' },
  { name: 'Blu', hex: '#1E88E5' },
  { name: 'Giallo', hex: '#FDD835' },
  { name: 'Arancione', hex: '#FB8C00' },
  { name: 'Viola', hex: '#8E24AA' },
  { name: 'Rosa', hex: '#EC407A' },
  { name: 'Marrone', hex: '#6D4C41' },
  { name: 'Nero', hex: '#212121' },
  { name: 'Bianco', hex: '#FAFAFA' },
  { name: 'Grigio', hex: '#9E9E9E' },
  { name: 'Azzurro', hex: '#29B6F6' },
  { name: 'Ciano', hex: '#00ACC1' },
];

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || '');
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function nearestColorName(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let best = null;
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const crgb = hexToRgb(c.hex);
    const dist = (rgb.r - crgb.r) ** 2 + (rgb.g - crgb.g) ** 2 + (rgb.b - crgb.b) ** 2;
    if (dist < bestDist) { bestDist = dist; best = c.name; }
  }
  return best;
}

// Multiplier applied to the score digit's base font-size per step (see
// .sb-point in styles.css) - kept modest since the base size already nearly
// fills the available space; mostly matters in "solo punteggio" mode and in
// portrait, where there's extra room to grow into.
const NUMBER_SIZE_SCALES = [1, 1.15, 1.3, 1.45];

export function applyColorsToDom(settings) {
  const root = document.documentElement.style;
  root.setProperty('--team-a-color', settings.teamAColor);
  root.setProperty('--team-b-color', settings.teamBColor);
  root.setProperty('--number-color', settings.numberColor);
  root.setProperty('--number-border-color', settings.numberBorderColor);
  root.setProperty('--number-border-width', `${settings.numberBorderWidth || 0}px`);
  root.setProperty('--number-size-scale', NUMBER_SIZE_SCALES[settings.numberSizeStep || 0] ?? 1);
}
