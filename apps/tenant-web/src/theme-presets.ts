import { contrastText } from './color-utils';

export type BrandingColors = {
  primaryColor: string;
  sidebarColor: string;
  accentColor: string;
  textColor: string;
  navActiveTextColor: string;
  navInactiveTextColor: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  swatch: [string, string, string];
  branding: BrandingColors;
};

function hexToHsl(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export type PaletteStyle = 'professional-dark' | 'light-minimal' | 'healthcare' | 'bold-contrast';

/** Build a full sidebar palette from one brand color, so a tenant only has
 * to pick a single hex and a style rather than every color by hand. */
export function generatePaletteFromBrand(brandHex: string, style: PaletteStyle): BrandingColors {
  const [h, s] = hexToHsl(brandHex);
  switch (style) {
    case 'light-minimal':
      return {
        primaryColor: brandHex,
        sidebarColor: '#ffffff',
        accentColor: hslToHex(h + 30, Math.min(s, 0.55), 0.45),
        textColor: '#0f172a',
        navActiveTextColor: contrastText(brandHex),
        navInactiveTextColor: '#475569',
      };
    case 'bold-contrast':
      return {
        primaryColor: brandHex,
        sidebarColor: hslToHex(h, Math.min(s + 0.1, 0.9), 0.12),
        accentColor: hslToHex(h + 180, s, 0.55),
        textColor: '#f8fafc',
        navActiveTextColor: contrastText(brandHex),
        navInactiveTextColor: hslToHex(h, s * 0.3, 0.75),
      };
    case 'healthcare':
      return {
        primaryColor: brandHex,
        sidebarColor: hslToHex(h, 0.35, 0.97),
        accentColor: hslToHex(h + 40, 0.5, 0.5),
        textColor: hslToHex(h, 0.4, 0.2),
        navActiveTextColor: '#ffffff',
        navInactiveTextColor: hslToHex(h, 0.25, 0.4),
      };
    case 'professional-dark':
    default:
      return {
        primaryColor: brandHex,
        sidebarColor: hslToHex(h, Math.min(s + 0.05, 0.85), 0.11),
        accentColor: hslToHex(h + 35, s, 0.55),
        textColor: '#f1f5f9',
        navActiveTextColor: contrastText(brandHex),
        navInactiveTextColor: hslToHex(h, s * 0.25, 0.72),
      };
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'zuzo-classic',
    name: 'ZuZo Classic',
    description: 'The default — dark ink sidebar, orange accent',
    swatch: ['#16140f', '#ff5a1f', '#f7f3ea'],
    branding: {
      primaryColor: '#ff5a1f',
      sidebarColor: '#16140f',
      accentColor: '#ff8a5c',
      textColor: '#f7f3ea',
      navActiveTextColor: '#ffffff',
      navInactiveTextColor: '#938d7e',
    },
  },
  {
    id: 'clinical-trust',
    name: 'Clinical Trust',
    description: 'Calm teal tones, suits healthcare/insurance',
    swatch: ['#f0fdfa', '#0d9488', '#134e4a'],
    branding: generatePaletteFromBrand('#0d9488', 'healthcare'),
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    description: 'Premium dark with a warm gold accent',
    swatch: ['#0c0a09', '#d97706', '#fbbf24'],
    branding: {
      primaryColor: '#d97706',
      sidebarColor: '#0c0a09',
      accentColor: '#fbbf24',
      textColor: '#fafaf9',
      navActiveTextColor: '#ffffff',
      navInactiveTextColor: '#a8a29e',
    },
  },
  {
    id: 'forest-pro',
    name: 'Forest Pro',
    description: 'Deep green sidebar, fresh emerald active state',
    swatch: ['#052e16', '#10b981', '#34d399'],
    branding: generatePaletteFromBrand('#10b981', 'professional-dark'),
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Rich violet with soft lavender highlights',
    swatch: ['#1e1b4b', '#7c3aed', '#a78bfa'],
    branding: generatePaletteFromBrand('#7c3aed', 'bold-contrast'),
  },
  {
    id: 'coral-energy',
    name: 'Coral Energy',
    description: 'Warm coral primary on a clean white sidebar',
    swatch: ['#ffffff', '#f97316', '#fb923c'],
    branding: generatePaletteFromBrand('#f97316', 'light-minimal'),
  },
  {
    id: 'ocean-depth',
    name: 'Ocean Depth',
    description: 'Deep navy with a cyan accent — fintech feel',
    swatch: ['#0c4a6e', '#0284c7', '#38bdf8'],
    branding: {
      primaryColor: '#0284c7',
      sidebarColor: hslToHex(hexToHsl('#0284c7')[0] + 10, 0.55, 0.14),
      accentColor: hslToHex(hexToHsl('#0284c7')[0] + 160, 0.45, 0.55),
      textColor: '#e0f2fe',
      navActiveTextColor: contrastText('#0284c7'),
      navInactiveTextColor: hslToHex(hexToHsl('#0284c7')[0], 0.2, 0.7),
    },
  },
  {
    id: 'slate-minimal',
    name: 'Slate Minimal',
    description: 'Light, airy sidebar with subtle slate accents',
    swatch: ['#f8fafc', '#475569', '#64748b'],
    branding: {
      primaryColor: '#475569',
      sidebarColor: '#f8fafc',
      accentColor: '#64748b',
      textColor: '#0f172a',
      navActiveTextColor: '#ffffff',
      navInactiveTextColor: '#64748b',
    },
  },
];
