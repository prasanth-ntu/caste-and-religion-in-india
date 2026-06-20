// =============================================================================
// lineage-tree/render — the SINGLE mini-map SVG renderer. Returns the inner
// markup (edges + nodes groups) for one Layout, given resolved highlight ids.
//
// Used BOTH server-side (Astro `set:html` into the <svg>) and client-side
// (`svg.innerHTML = …` when the reactive /compare + /lineage selection changes),
// so the build-time and runtime renders are byte-identical by construction. No
// DOM APIs — pure string building.
// =============================================================================

import { LINEAGE } from '../chart-tokens';
import type { Layout } from './types';
import { ancestorChain, lcaOfChains } from './layout';

const C = LINEAGE;

export interface MinimapHighlight {
  /** Resolved primary highlight node id (indigo). */
  slugA: string | null;
  /** Resolved compare secondary node id (amber). null/undefined = single mode. */
  slugB?: string | null;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Inner SVG markup for the locator mini-map. The caller supplies the wrapping
 * `<svg viewBox=…>`; this returns the `<g class="vjl-edges">` + `<g
 * class="vjl-nodes">` content (with the optional LCA marker) so the same string
 * drops into SSR markup or a runtime `innerHTML` assignment.
 */
export function renderMinimapInner(layout: Layout, hl: MinimapHighlight): string {
  const { byId } = layout;
  const slugA = hl.slugA;
  const slugB = hl.slugB ?? null;
  const compare = slugB !== null;

  const chainA = ancestorChain(byId, slugA);
  const chainB = compare ? ancestorChain(byId, slugB) : [];
  const setA = new Set(chainA);
  const setB = new Set(chainB);
  const lcaId = compare ? lcaOfChains(chainA, chainB) : null;

  // ---- edges ----
  const edgeMarkup = layout.edges
    .map((e) => {
      const a = byId[e.from];
      const b = byId[e.to];
      if (!a || !b) return '';
      const onA = setA.has(e.from) && setA.has(e.to);
      const onB = setB.has(e.from) && setB.has(e.to);
      const stroke = onA && onB ? C.lca : onA ? C.a : onB ? C.b : C.edge;
      const width = onA || onB ? 1.5 : 0.75;
      const attrs = `data-from="${esc(e.from)}" data-to="${esc(e.to)}" stroke="${stroke}" stroke-width="${width}"`;
      // top-down cubic bezier
      const my = (a.y + b.y) / 2;
      return `<path ${attrs} d="M${a.x},${a.y}C${a.x},${my} ${b.x},${my} ${b.x},${b.y}"/>`;
    })
    .join('');

  // ---- nodes ----
  const baseFont = 9;
  const dimFont = 8;
  const nodeMarkup = layout.nodes
    .map((n) => {
      const isA = n.id === slugA;
      const isB = n.id === slugB;
      const hlNode = isA || isB;
      const fill = isA ? C.a : isB ? C.b : C.node;
      const stroke = isA ? C.a : isB ? C.b : C.nodeStroke;
      const r = hlNode ? 4.5 : 3;
      const sw = hlNode ? 1.2 : 0.6;
      const labelFill = isA ? C.a : isB ? C.b : C.label;
      const labelSize = hlNode ? baseFont : dimFont;
      const labelWeight = hlNode ? 700 : 400;
      const labelStyle = hlNode ? '' : 'display:none;';
      // In compare mode the two selected leaves often sit side by side, so push
      // the A label left and the B label right to keep them from colliding.
      const leftSide = compare && isA;
      const labelX = leftSide ? -6 : 6;
      const labelAnchor = leftSide ? 'end' : 'start';
      return (
        `<g class="vjl-node" data-slug="${esc(n.id)}" data-highlight="${hlNode ? 'true' : 'false'}" transform="translate(${n.x} ${n.y})">` +
        `<circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"><title>${esc(n.name)} — ${esc(n.level)}</title></circle>` +
        `<text class="vjl-label" x="${labelX}" y="3" text-anchor="${labelAnchor}" font-size="${labelSize}" font-weight="${labelWeight}" fill="${labelFill}" style="${labelStyle}">${esc(n.name)}</text>` +
        `</g>`
      );
    })
    .join('');

  // ---- LCA marker (compare only) ----
  let lcaMarker = '';
  if (compare && lcaId && byId[lcaId]) {
    const m = byId[lcaId];
    const pts = '0,-5 5,0 0,5 -5,0';
    lcaMarker =
      `<g class="vjl-lca-marker" transform="translate(${m.x} ${m.y})">` +
      `<polygon points="${pts}" fill="none" stroke="${C.lca}" stroke-width="1.5"><title>Common ancestor: ${esc(m.name)}</title></polygon>` +
      `</g>`;
  }

  return (
    `<g class="vjl-edges" fill="none" stroke-linecap="round">${edgeMarkup}</g>` +
    `<g class="vjl-nodes">${nodeMarkup}${lcaMarker}</g>`
  );
}

export interface ForkCrumb {
  id: string;
  name: string;
}

export interface ForkPath {
  /** Root→LCA, inclusive — the ancestry both lineages share. */
  shared: ForkCrumb[];
  /** LCA→A, exclusive of the LCA — where lineage A diverges. */
  aTail: ForkCrumb[];
  /** LCA→B, exclusive of the LCA — where lineage B diverges. */
  bTail: ForkCrumb[];
}

/**
 * The ancestry "fork": the shared root→LCA path plus each lineage's divergent
 * tail. Powers the compare breadcrumb ("show all the parent names"). Returns
 * null until both sides resolve.
 */
export function forkPath(layout: Layout, slugA: string | null, slugB: string | null): ForkPath | null {
  const { byId } = layout;
  if (!slugA || !slugB) return null;
  const chainA = ancestorChain(byId, slugA);
  const chainB = ancestorChain(byId, slugB);
  const lcaId = lcaOfChains(chainA, chainB);
  if (!lcaId) return null;
  const lcaIdx = chainA.indexOf(lcaId);
  const crumb = (id: string): ForkCrumb => ({ id, name: byId[id]?.name ?? id });
  return {
    shared: chainA.slice(0, lcaIdx + 1).map(crumb),
    aTail: chainA.slice(lcaIdx + 1).map(crumb),
    bTail: chainB.slice(lcaIdx + 1).map(crumb),
  };
}

/**
 * Markup for the compare ancestry breadcrumb: the shared root→LCA path on one
 * line, then each lineage's divergent tail. One implementation for SSR
 * (`set:html`) and the reactive client (`innerHTML`).
 */
export function renderForkBreadcrumb(fork: ForkPath): string {
  const sep = '<span class="text-stone-300" aria-hidden="true">›</span>';
  const join = (crumbs: ForkCrumb[]) => crumbs.map((c) => `<span>${esc(c.name)}</span>`).join(sep);
  const sharedRow =
    `<div class="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-stone-600">` +
    `<span aria-hidden="true">🌳</span>${join(fork.shared)}</div>`;
  const tail = (crumbs: ForkCrumb[], color: string, tag: string) => {
    const label = crumbs.length ? join(crumbs) : '<span>(this node)</span>';
    return (
      `<div class="flex flex-wrap items-center gap-x-1">` +
      `<span class="text-stone-400" aria-hidden="true">↳</span>` +
      `<span class="font-semibold" style="color:${color}">${tag}</span>` +
      `<span class="font-medium" style="color:${color}">${label}</span></div>`
    );
  };
  return (
    sharedRow +
    tail(fork.aTail, C.a, 'A') +
    tail(fork.bTail, C.b, 'B')
  );
}

/** LCA summary (names + levels-up) for the caption line, compare mode. */
export function compareSummary(layout: Layout, slugA: string | null, slugB: string | null) {
  const { byId } = layout;
  const chainA = ancestorChain(byId, slugA);
  const chainB = ancestorChain(byId, slugB);
  const lcaId = lcaOfChains(chainA, chainB);
  if (!slugA || !slugB || !lcaId) return null;
  const depth = (id: string) => (byId[id] ? byId[id].depth : 0);
  const levelsUp = Math.max(depth(slugA), depth(slugB)) - depth(lcaId);
  return {
    lcaId,
    aName: byId[slugA]?.name ?? '',
    bName: byId[slugB]?.name ?? '',
    lcaName: byId[lcaId]?.name ?? '',
    levelsUp,
  };
}
