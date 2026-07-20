// Interface accent color presets (buttons, active tabs, highlights) - distinct
// from js/color-presets.js, which only colors the two scoreboard team halves.
// "default" means "leave the theme's own dark/light accent alone" rather than
// forcing a color, since dark and light mode already use different accent
// shades tuned for contrast.
export const UI_ACCENT_PRESETS = {
  default: { label: 'Predefinito', accent: null, accent2: null, contrast: null },
  emerald: { label: 'Smeraldo', accent: '#22C55E', accent2: '#0EA5E9', contrast: '#04150B' },
  sunset: { label: 'Tramonto', accent: '#FF7A45', accent2: '#FFC069', contrast: '#2B0E00' },
  ocean: { label: 'Oceano', accent: '#38BDF8', accent2: '#818CF8', contrast: '#031824' },
  berry: { label: 'Bacca', accent: '#EC4899', accent2: '#A855F7', contrast: '#2B0018' },
  mono: { label: 'Mono', accent: '#E5E7EB', accent2: '#9CA3AF', contrast: '#111111' },
};

export function applyUiAccent(presetId) {
  const root = document.documentElement.style;
  const p = UI_ACCENT_PRESETS[presetId] || UI_ACCENT_PRESETS.default;
  if (p.accent) {
    root.setProperty('--accent', p.accent);
    root.setProperty('--accent-2', p.accent2);
    root.setProperty('--accent-contrast', p.contrast);
  } else {
    root.removeProperty('--accent');
    root.removeProperty('--accent-2');
    root.removeProperty('--accent-contrast');
  }
}
