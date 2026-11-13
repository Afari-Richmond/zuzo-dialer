import type { TenantBranding } from './api';
import { contrastText, hexToRgba, hoverBg, subtleText } from './color-utils';

/** Lightens a hex color toward white by `amount` (0-1) — used to derive the
 * primary color's glow shade. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * amount));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const DEFAULT_SIDEBAR = '#16140f';

/** Drives every themeable CSS var from one tenant's branding settings — the
 * sidebar, active-nav highlight, and glow/shadow all derive from just a
 * primary color and a sidebar color, so a tenant only has to pick those
 * (or a preset) rather than every token individually. Standalone module so
 * both App.tsx and settings-pages.tsx can call it without a circular import
 * (App renders SettingsPage, which needs this for its live preview). */
export function applyBranding(branding: TenantBranding | null) {
  const root = document.documentElement;
  const primary = branding?.primaryColor;
  const sidebar = branding?.sidebarColor ?? (primary ? DEFAULT_SIDEBAR : null);

  if (!primary) {
    for (const prop of [
      '--primary',
      '--primary-foreground',
      '--primary-glow',
      '--ring',
      '--sidebar',
      '--sidebar-foreground',
      '--sidebar-muted',
      '--sidebar-hover',
      '--primary-shadow',
    ]) {
      root.style.removeProperty(prop);
    }
    return;
  }

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', branding?.navActiveTextColor || contrastText(primary));
  root.style.setProperty('--primary-glow', lighten(primary, 0.35));
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--primary-shadow', hexToRgba(primary, 0.35));

  if (sidebar) {
    root.style.setProperty('--sidebar', sidebar);
    root.style.setProperty('--sidebar-foreground', branding?.textColor || contrastText(sidebar));
    root.style.setProperty('--sidebar-muted', branding?.navInactiveTextColor || subtleText(sidebar));
    root.style.setProperty('--sidebar-hover', hoverBg(sidebar));
  }
}
