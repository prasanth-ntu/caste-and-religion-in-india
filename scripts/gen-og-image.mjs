#!/usr/bin/env node
// gen-og-image.mjs — one-shot generator for public/og-image.png (1200x630).
//
// Usage: node scripts/gen-og-image.mjs
//
// Renders an SVG composition and converts it to PNG via @resvg/resvg-js.
// Re-run only when the design changes; the resulting PNG is committed.
//
// TODO Phase 3 follow-up: regenerate with Fraunces title + lineage tagline.
//   The current PNG uses Inter for the title and a generic site tagline. The
//   editorial pass calls for a Fraunces serif title (matching the in-page
//   wordmark) and a lineage-flavoured tagline (e.g. "From the Kongu Vellala
//   Gounder lineage outward"). Resvg needs Fraunces available locally to
//   embed; add font loading + tagline swap when picking this up.

import { Resvg } from '@resvg/resvg-js';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'public', 'og-image.png');

// Bundled Noto Sans Tamil, used to pre-shape the Tamil tagline (see shapeTamil
// below). resvg's own text engine does NOT shape Tamil correctly — it silently
// drops vowel signs (ா) and consonants (ள), turning "சாதி … தெளிவாக்கம்" into
// "சதி … தெிவக்கம்". So we shape with HarfBuzz (hb-view) into vector outlines
// and embed those paths instead of relying on resvg to lay out the glyphs.
const TAMIL_FONT_MEDIUM = resolve(__dirname, 'fonts', 'NotoSansTamil-Medium.ttf');

// Tailwind stone / accent palette
const BG = '#fafaf9';        // stone-50
const STONE_900 = '#1c1917';
const STONE_700 = '#44403c';
const STONE_500 = '#78716c';
const STONE_300 = '#d6d3d1';
const ROSE = '#e11d48';      // rose-600
const AMBER = '#d97706';     // amber-600
const SKY = '#0284c7';       // sky-600
const EMERALD = '#059669';   // emerald-600

// Tamil tagline — "Caste & religion, decoded" (literal: "clarification of caste and religion")
// "சாதி" = caste, "மதம்" = religion, "தெளிவாக்கம்" = clarification/decoding
// Plain text (real ampersand) — handed to HarfBuzz, not embedded as XML.
const TAMIL_TAGLINE = 'சாதி & மதம் — தெளிவாக்கம்';
const TAMIL_FONT_SIZE = 36;

// Shape `text` with HarfBuzz into an SVG <g> of glyph outlines, positioned so its
// baseline sits at (x, baselineY) in the parent canvas. Returns the markup string.
// Requires `hb-view` on PATH (Homebrew: `brew install harfbuzz`).
function shapeTamil(text, { fontFile, fontSize, x, baselineY, fill }) {
  const tmp = resolve(tmpdir(), 'og-tamil-tagline.svg');
  execFileSync('hb-view', [
    `--font-file=${fontFile}`,
    '--output-format=svg',
    `--font-size=${fontSize}`,
    '--margin=0',
    '-o', tmp,
    text,
  ]);
  let raw = readFileSync(tmp, 'utf8');
  rmSync(tmp, { force: true });

  // Baseline offset within hb-view's own coordinate space (y of the first glyph).
  const localBaseline = Number(/<use[^>]*\by="([\d.]+)"/.exec(raw)?.[1] ?? 0);

  // Strip the XML prolog + outer <svg> wrapper, drop hb-view's white background
  // rect, and recolor the glyph fill from black to the requested shade.
  const inner = raw
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<rect[^>]*fill="rgb\(100%, 100%, 100%\)"[^>]*\/>/g, '')
    .replace(/fill="rgb\(0%, 0%, 0%\)"/g, `fill="${fill}"`)
    .replace(/xlink:href/g, 'href');

  const ty = baselineY - localBaseline;
  return `<g transform="translate(${x}, ${ty})">${inner}</g>`;
}

const tamilTaglineMarkup = shapeTamil(TAMIL_TAGLINE, {
  fontFile: TAMIL_FONT_MEDIUM,
  fontSize: TAMIL_FONT_SIZE,
  x: 80,
  baselineY: 270,
  fill: STONE_700,
});

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${EMERALD}"/>
      <stop offset="33%" stop-color="${AMBER}"/>
      <stop offset="66%" stop-color="${ROSE}"/>
      <stop offset="100%" stop-color="${SKY}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${BG}"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="8" fill="url(#accentBar)"/>

  <!-- Subtle decorative dots in upper right -->
  <g opacity="0.18" fill="${STONE_500}">
    <circle cx="1100" cy="80"  r="3"/>
    <circle cx="1130" cy="80"  r="3"/>
    <circle cx="1160" cy="80"  r="3"/>
    <circle cx="1100" cy="110" r="3"/>
    <circle cx="1130" cy="110" r="3"/>
    <circle cx="1160" cy="110" r="3"/>
    <circle cx="1100" cy="140" r="3"/>
    <circle cx="1130" cy="140" r="3"/>
    <circle cx="1160" cy="140" r="3"/>
  </g>

  <!-- Site title -->
  <text x="80" y="200"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="84" font-weight="700" fill="${STONE_900}"
        letter-spacing="-2">
    decoded<tspan fill="${ROSE}">.</tspan>prasanth<tspan fill="${ROSE}">.</tspan>io
  </text>

  <!-- Tamil accent (pre-shaped to outlines via HarfBuzz; see shapeTamil) -->
  ${tamilTaglineMarkup}

  <!-- English tagline (two lines) -->
  <text x="80" y="360"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="32" font-weight="400" fill="${STONE_700}">
    Interactive, evidence-tiered exploration of caste
  </text>
  <text x="80" y="402"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="32" font-weight="400" fill="${STONE_700}">
    and religion in India — with a personal deep-dive
  </text>
  <text x="80" y="444"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="32" font-weight="400" fill="${STONE_700}">
    into the Kongu Vellala Gounder lineage.
  </text>

  <!-- Divider above legend -->
  <line x1="80" y1="510" x2="1120" y2="510" stroke="${STONE_300}" stroke-width="1"/>

  <!-- Evidence legend label -->
  <text x="80" y="552"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="18" font-weight="600" fill="${STONE_900}"
        letter-spacing="2">
    EVIDENCE TIERS
  </text>

  <!-- Legend items -->
  <g font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
     font-size="22" font-weight="500" fill="${STONE_700}">
    <!-- Green dot + label -->
    <circle cx="92"  cy="592" r="9" fill="${EMERALD}"/>
    <text x="112" y="599">well-established</text>

    <!-- Amber dot + label -->
    <circle cx="372" cy="592" r="9" fill="${AMBER}"/>
    <text x="392" y="599">plausible / debated</text>

    <!-- Rose dot + label -->
    <circle cx="660" cy="592" r="9" fill="${ROSE}"/>
    <text x="680" y="599">myth / unverified</text>

    <!-- Sky dot + label (rational) -->
    <circle cx="920" cy="592" r="9" fill="${SKY}"/>
    <text x="940" y="599">rational basis</text>
  </g>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'Helvetica',
  },
  background: BG,
});

const pngData = resvg.render().asPng();
writeFileSync(outPath, pngData);

console.log(`Wrote ${outPath} (${pngData.length} bytes)`);
