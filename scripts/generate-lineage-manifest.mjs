#!/usr/bin/env node
// generate-lineage-manifest.mjs
//
// Reads src/content/kootams/*.md + src/content/deities/*.md and emits:
//  1. src/data/lineage-manifest.json — flat, shippable manifest used by the
//     selector / compare React islands (so they don't need to hit the Astro
//     content layer at runtime).
//  2. A regenerated table inside README.md between the markers
//     <!-- LINEAGE-TABLE:START --> and <!-- LINEAGE-TABLE:END -->
//
// Run via:   npm run gen:manifest
// Wired as:  prebuild  (see package.json)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const KOOTAMS_DIR = join(root, 'src/content/kootams');
const DEITIES_DIR = join(root, 'src/content/deities');
const OUT_JSON = join(root, 'src/data/lineage-manifest.json');
const README = join(root, 'README.md');

const TOTEM_EMOJI = {
  bird: '🐦',
  tree: '🌳',
  fish: '🐟',
  flower: '🌸',
  other: '✶',
};

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const yaml = m[1];
  const obj = {};
  const lines = yaml.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('#')) {
      i++;
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    let value = kv[2];
    if (value === '' || value === undefined) {
      // Could be a nested object or list — peek ahead.
      const peek = lines[i + 1] || '';
      if (peek.startsWith('  - ')) {
        const arr = [];
        i++;
        while (i < lines.length && lines[i].startsWith('  - ')) {
          arr.push(lines[i].slice(4).trim().replace(/^['"]|['"]$/g, ''));
          i++;
        }
        obj[key] = arr;
        continue;
      } else if (peek.startsWith('  ')) {
        const nested = {};
        i++;
        while (i < lines.length && lines[i].startsWith('  ') && !lines[i].startsWith('  - ')) {
          const nm = lines[i].match(/^  ([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
          if (nm) nested[nm[1]] = nm[2].replace(/^['"]|['"]$/g, '');
          i++;
        }
        obj[key] = nested;
        continue;
      } else {
        obj[key] = '';
        i++;
        continue;
      }
    }
    if (value === '[]') {
      obj[key] = [];
    } else {
      obj[key] = value.replace(/^['"]|['"]$/g, '');
    }
    i++;
  }
  return obj;
}

function loadKootams() {
  return readdirSync(KOOTAMS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseFrontmatter(readFileSync(join(KOOTAMS_DIR, f), 'utf8')));
}

function loadDeities() {
  const out = {};
  for (const f of readdirSync(DEITIES_DIR).filter((x) => x.endsWith('.md'))) {
    const fm = parseFrontmatter(readFileSync(join(DEITIES_DIR, f), 'utf8'));
    if (fm.slug) out[fm.slug] = fm;
  }
  return out;
}

const kootams = loadKootams();
const deities = loadDeities();

const manifest = kootams
  .map((k) => {
    const deity = k.deity && deities[k.deity] ? deities[k.deity] : null;
    return {
      slug: k.slug,
      name: k.name,
      tamilName: k.totem?.tamil_name ?? '',
      totemEmoji: TOTEM_EMOJI[k.totem?.type] ?? '✶',
      totemType: k.totem?.type ?? 'other',
      totemSpecies: k.totem?.species ?? '',
      region: k.region ?? '',
      status: k.status ?? 'documented',
      attestation: k.attestation ?? null,
      deity: deity
        ? {
            slug: deity.slug,
            name: deity.name,
            tamilName: deity.tamil_name ?? '',
            village: deity.village ?? '',
            district: deity.district ?? '',
            tradition: deity.tradition ?? '',
            festivals: deity.festivals ?? [],
            attestation: deity.attestation ?? null,
          }
        : null,
    };
  })
  .sort((a, b) => {
    // documented first, then named, then numbered stubs
    const order = (k) => {
      if (k.status === 'stub') return 2;
      if (k.attestation === 'community' || k.attestation === 'oral-family') return 0;
      return 1;
    };
    const oa = order(a);
    const ob = order(b);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });

writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + '\n');
console.log(`✔ wrote ${manifest.length} entries to ${OUT_JSON}`);

// --- README table -----------------------------------------------------------

const documented = manifest.filter((m) => m.status === 'documented' && m.deity);
const namedNoDeity = manifest.filter((m) => m.status === 'documented' && !m.deity);
const stubs = manifest.filter((m) => m.status === 'stub');

const rows = [
  '| Kootam (slug) | Status | Deity (Kuladeivam) | Village / District | Attestation |',
  '|---|---|---|---|---|',
  ...documented.map(
    (k) =>
      `| **${k.name}** (\`${k.slug}\`) | documented | ${k.deity.name} | ${
        k.deity.village || '—'
      }${k.deity.district ? ` / ${k.deity.district}` : ''} | ${k.attestation ?? '—'} |`
  ),
  ...namedNoDeity.map(
    (k) => `| ${k.name} (\`${k.slug}\`) | named-only | — | — | published list |`
  ),
  `| \`kootam-001\` … \`kootam-120\` (${stubs.length} entries) | stub | — | — | — — _wanted: contributions_ |`,
];

const table = rows.join('\n');

const readmeRaw = readFileSync(README, 'utf8');
const START = '<!-- LINEAGE-TABLE:START -->';
const END = '<!-- LINEAGE-TABLE:END -->';
let next;
if (readmeRaw.includes(START) && readmeRaw.includes(END)) {
  next = readmeRaw.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    `${START}\n\n${table}\n\n${END}`
  );
} else {
  next =
    readmeRaw.trimEnd() +
    `\n\n## Documented vs Wanted Lineages\n\n` +
    `Generated by \`scripts/generate-lineage-manifest.mjs\`. Re-run via \`npm run gen:manifest\`.\n\n` +
    `${START}\n\n${table}\n\n${END}\n`;
}
writeFileSync(README, next);
console.log(`✔ README table updated (${documented.length} documented, ${namedNoDeity.length} named-only, ${stubs.length} stubs)`);
