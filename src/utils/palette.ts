import type { PaletteColors, PalettePreset } from "../types";

/** Parse a hex color (#RGB, #RRGGBB, #RRGGBBAA) to { r, g, b } (0-255). */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

/** Relative luminance per WCAG 2.1 (0–1). */
export function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = relativeLuminance(hexToRgb(hex1));
    const l2 = relativeLuminance(hexToRgb(hex2));
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch (e) {
    return 1;
  }
}

/** Returns true if the contrast ratio meets WCAG AA for normal text (≥ 4.5:1). */
export function meetsWCAG(hex1: string, hex2: string): boolean {
  return getContrastRatio(hex1, hex2) >= 4.5;
}

/** Convert hex to rgba string with given alpha. */
export function hexToRgba(hex: string, alpha = 1): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch (e) {
    return `rgba(0,0,0,${alpha})`;
  }
}

/**
 * Each palette has 5 semantic roles:
 *  - primary:    Dominant accent (shape fills, highlights)
 *  - secondary:  Supporting accent (subtle shapes, gradients)
 *  - surface:    Glass panel tint color
 *  - text:       Text labels on the glass panel
 *  - background: Card background base
 */
export const palettePresets: PalettePreset[] = [
  {
    name: 'Ocean',
    colors: {
      primary:    '#0077B6',
      secondary:  '#00B4D8',
      surface:    '#FFFFFF',
      text:       '#03045E',
      background: '#CAF0F8'
    }
  },
  {
    name: 'Sunset',
    colors: {
      primary:    '#E76F51',
      secondary:  '#F4A261',
      surface:    '#FFFFFF',
      text:       '#264653',
      background: '#FFF1E6'
    }
  },
  {
    name: 'Forest',
    colors: {
      primary:    '#2D6A4F',
      secondary:  '#52B788',
      surface:    '#FFFFFF',
      text:       '#1B4332',
      background: '#D8F3DC'
    }
  },
  {
    name: 'Midnight',
    colors: {
      primary:    '#7B2CBF',
      secondary:  '#C77DFF',
      surface:    '#16162A',
      text:       '#E0AAFF',
      background: '#10002B'
    }
  },
  {
    name: 'Monochrome',
    colors: {
      primary:    '#404040',
      secondary:  '#8A8A8A',
      surface:    '#FFFFFF',
      text:       '#1A1A1A',
      background: '#F2F2F2'
    }
  },
  {
    name: 'Coral',
    colors: {
      primary:    '#E63946',
      secondary:  '#F4A261',
      surface:    '#FFFFFF',
      text:       '#1D3557',
      background: '#F1FAEE'
    }
  },
  {
    name: 'Arctic',
    colors: {
      primary:    '#48CAE4',
      secondary:  '#ADE8F4',
      surface:    '#FFFFFF',
      text:       '#023E8A',
      background: '#EDF6F9'
    }
  },
  {
    name: 'Ember',
    colors: {
      primary:    '#F77F00',
      secondary:  '#FCBF49',
      surface:    '#141414',
      text:       '#EAE2B7',
      background: '#003049'
    }
  }
];

/** Returns the default palette (Ocean). */
export function getDefaultPalette(): PaletteColors {
  return { ...palettePresets[0].colors };
}

/** Clones a palette colors object. */
export function clonePalette(colors: PaletteColors): PaletteColors {
  return { ...colors };
}

/** Dynamically resolves bold/punchy dark colors if chrome is off and background is light. */
export function getRenderPalette(palette: PaletteColors, useChrome: boolean): PaletteColors {
  if (useChrome) return palette;

  const { r, g, b } = hexToRgb(palette.background);
  const lum = relativeLuminance({ r, g, b });

  if (lum > 0.5) {
    const bgLower = palette.background.toLowerCase();
    if (bgLower === '#caf0f8') {
      // Ocean bold
      return {
        primary: '#00B4D8',
        secondary: '#90E0EF',
        surface: 'rgba(5, 25, 45, 0.85)',
        text: '#FFE500',
        background: '#031D33'
      };
    }
    if (bgLower === '#fff1e6') {
      // Sunset bold
      return {
        primary: '#E76F51',
        secondary: '#F4A261',
        surface: 'rgba(40, 20, 10, 0.85)',
        text: '#F4A261',
        background: '#1A0B05'
      };
    }
    if (bgLower === '#d8f3dc') {
      // Forest bold
      return {
        primary: '#52B788',
        secondary: '#74C69D',
        surface: 'rgba(10, 35, 20, 0.85)',
        text: '#D8F3DC',
        background: '#041F10'
      };
    }
    if (bgLower === '#f2f2f2') {
      // Monochrome bold
      return {
        primary: '#E5E5E5',
        secondary: '#A3A3A3',
        surface: 'rgba(20, 20, 20, 0.85)',
        text: '#F5F5F5',
        background: '#121212'
      };
    }
    if (bgLower === '#f1faee') {
      // Coral bold
      return {
        primary: '#E63946',
        secondary: '#F4A261',
        surface: 'rgba(30, 10, 15, 0.85)',
        text: '#FFE500',
        background: '#1D030A'
      };
    }
    if (bgLower === '#edf6f9') {
      // Arctic bold
      return {
        primary: '#48CAE4',
        secondary: '#ADE8F4',
        surface: 'rgba(5, 30, 40, 0.85)',
        text: '#E0FAFF',
        background: '#021F28'
      };
    }
  }

  return palette;
}
