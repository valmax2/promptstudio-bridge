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

export function applyColorsToDom(settings) {
  const root = document.documentElement.style;
  root.setProperty('--team-a-color', settings.teamAColor);
  root.setProperty('--team-b-color', settings.teamBColor);
  root.setProperty('--number-color', settings.numberColor);
  root.setProperty('--number-border-color', settings.numberBorderColor);
  root.setProperty('--number-border-width', `${settings.numberBorderWidth || 0}px`);
}
