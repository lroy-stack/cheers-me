/**
 * OKLCH Palette Generator
 *
 * Takes a primary and accent HEX color and generates a full set of CSS
 * custom properties in OKLCH space for both light and dark modes.
 *
 * The output format matches the OKLCH triplet format used in globals.css:
 *   "L C H" (e.g. "0.3800 0.1523 18.6219")
 */

// --- HEX → sRGB → Linear RGB → OKLAB → OKLCH pipeline ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = linearize(r)
  const lg = linearize(g)
  const lb = linearize(b)

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ]
}

function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b)
  let H = (Math.atan2(b, a) * 180) / Math.PI
  if (H < 0) H += 360
  return [L, C, H]
}

function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  const [L, a, ob] = rgbToOklab(r, g, b)
  return oklabToOklch(L, a, ob)
}

function fmt(L: number, C: number, H: number): string {
  return `${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(4)}`
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

interface PaletteOutput {
  light: Record<string, string>
  dark: Record<string, string>
}

export function generatePalette(primaryHex: string, accentHex: string): PaletteOutput {
  const [pL, pC, pH] = hexToOklch(primaryHex)
  const [aL, aC, aH] = hexToOklch(accentHex)

  // Helper to create OKLCH triplet with adjusted lightness/chroma
  const p = (l: number, cMult: number) => fmt(clamp01(l), pC * cMult, pH)

  // Chart colors: gradient from primary hue to accent hue
  const chartH = (i: number) => pH + ((aH - pH) * i) / 4
  const chartC = (i: number) => pC + ((aC - pC) * i) / 4
  const chartL = (i: number, base: number) => base + 0.05 * i

  const light: Record<string, string> = {
    '--primary': fmt(pL, pC, pH),
    '--primary-foreground': '1.0000 0 0',
    '--accent': fmt(aL, aC, aH),
    '--accent-foreground': '1.0000 0 0',
    '--secondary': p(0.94, 0.1),
    '--secondary-foreground': fmt(pL, pC, pH),
    '--muted': p(0.94, 0.14),
    '--muted-foreground': p(0.51, 0.25),
    '--border': p(0.88, 0.14),
    '--input': p(0.88, 0.14),
    '--ring': fmt(pL, pC, pH),
    '--chart-1': fmt(pL, pC, pH),
    '--chart-2': fmt(clamp01(chartL(1, pL)), chartC(1), chartH(1)),
    '--chart-3': fmt(clamp01(chartL(2, pL)), chartC(2), chartH(2)),
    '--chart-4': fmt(clamp01(chartL(3, pL)), chartC(3), chartH(3)),
    '--chart-5': fmt(clamp01(chartL(4, pL)), chartC(4), chartH(4)),
    '--sidebar-background': p(0.24, 0.52),
    '--sidebar-foreground': p(0.98, 0.04),
    '--sidebar-primary': p(0.70, 1.05),
    '--sidebar-primary-foreground': '1.0000 0 0',
    '--sidebar-accent': p(0.32, 0.59),
    '--sidebar-accent-foreground': p(0.98, 0.04),
    '--sidebar-border': p(0.38, 0.46),
    '--sidebar-ring': p(0.70, 1.05),
  }

  // Dark mode: invert lightness relationships
  const dark: Record<string, string> = {
    '--primary': fmt(clamp01(pL + 0.23), pC * 1.37, pH),
    '--primary-foreground': '1.0000 0 0',
    '--accent': fmt(clamp01(aL + 0.20), aC * 1.49, aH),
    '--accent-foreground': '1.0000 0 0',
    '--secondary': p(0.24, 0.52),
    '--secondary-foreground': p(0.92, 0.26),
    '--muted': p(0.20, 0.35),
    '--muted-foreground': p(0.76, 0.40),
    '--border': p(0.28, 0.53),
    '--input': p(0.28, 0.53),
    '--ring': fmt(clamp01(pL + 0.27), pC * 1.57, pH),
    '--chart-1': fmt(clamp01(pL + 0.23), pC * 1.37, pH),
    '--chart-2': fmt(clamp01(chartL(1, pL) + 0.30), chartC(1) * 0.9, chartH(1)),
    '--chart-3': fmt(pL, pC, pH),
    '--chart-4': fmt(clamp01(chartL(3, pL) + 0.40), chartC(3) * 0.6, chartH(3)),
    '--chart-5': fmt(clamp01(pL - 0.07), pC * 0.68, pH),
    '--sidebar-background': p(0.10, 0.37),
    '--sidebar-foreground': p(0.96, 0.10),
    '--sidebar-primary': fmt(clamp01(pL + 0.23), pC * 1.37, pH),
    '--sidebar-primary-foreground': '1.0000 0 0',
    '--sidebar-accent': p(0.20, 0.33),
    '--sidebar-accent-foreground': p(0.96, 0.10),
    '--sidebar-border': p(0.25, 0.39),
    '--sidebar-ring': fmt(clamp01(pL + 0.23), pC * 1.37, pH),
  }

  return { light, dark }
}

/**
 * Generate a CSS string that overrides :root and .dark with palette values.
 * Does NOT touch --destructive or --destructive-foreground (safety UX).
 */
export function generatePaletteCSS(primaryHex: string, accentHex: string): string {
  const { light, dark } = generatePalette(primaryHex, accentHex)

  const lightVars = Object.entries(light)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n')

  const darkVars = Object.entries(dark)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n')

  return `:root {\n${lightVars}\n  }\n  .dark {\n${darkVars}\n  }`
}
