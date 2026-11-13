/** WCAG relative luminance (0 = black, 1 = white). */
export function hexLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Lighten (positive delta) or darken (negative delta) a hex color. */
export function hexAdjust(hex: string, delta: number): string {
  const c = hex.replace('#', '');
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  const r = clamp(parseInt(c.slice(0, 2), 16) + delta * 255);
  const g = clamp(parseInt(c.slice(2, 4), 16) + delta * 255);
  const b = clamp(parseInt(c.slice(4, 6), 16) + delta * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function isDarkColor(hex: string): boolean {
  return hexLuminance(hex) < 0.4;
}

/** White or near-black, whichever contrasts best against `bg`. */
export function contrastText(bg: string): string {
  return isDarkColor(bg) ? '#ffffff' : '#0f172a';
}

/** A subdued but still readable color on `bg` — inactive nav labels. */
export function subtleText(bg: string): string {
  return isDarkColor(bg) ? '#94a3b8' : '#64748b';
}

/** A hover background slightly offset from `bg` — lightens dark, darkens light. */
export function hoverBg(bg: string): string {
  return isDarkColor(bg) ? hexAdjust(bg, 0.07) : hexAdjust(bg, -0.07);
}

export function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
