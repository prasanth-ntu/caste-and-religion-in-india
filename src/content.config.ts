import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const sources = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,json}', base: './src/content/sources' }),
  schema: z.object({
    id: z.string(),
    type: z.enum(['paper', 'book', 'wiki', 'inscription', 'oral']),
    title: z.string(),
    authors: z.array(z.string()).default([]),
    year: z.number().optional(),
    url: z.string().url().optional(),
    archived_url: z.string().url().optional(),
    notes: z.string().optional(),
  }),
});

const claims = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,json}', base: './src/content/claims' }),
  schema: z.object({
    id: z.string(),
    statement: z.string(),
    tier: z.enum(['green', 'yellow', 'red', 'rational']),
    sources: z.array(reference('sources')).default([]),
    rebuttal: z.string().optional(),
    evidence_summary: z.string(),
  }),
});

const kootams = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/kootams' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    totem: z.object({
      type: z.string(),
      species: z.string(),
      tamil_name: z.string(),
    }),
    region: z.string().optional(),
    deity: reference('deities').optional(),
    exogamy_with: z.array(reference('kootams')).default([]),
    claims: z.array(reference('claims')).default([]),
    status: z.enum(['documented', 'stub']).default('documented'),
    attestation: z.enum(['academic', 'community', 'oral-family']).optional(),
  }),
});

const deities = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/deities' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tradition: z.string(),
    village: z.string().optional(),
    district: z.string().optional(),
    tamil_name: z.string().optional(),
    geo: z
      .object({
        lat: z.number(),
        lng: z.number(),
        zoom: z.number(),
      })
      .optional(),
    kootam: reference('kootams').optional(),
    iconography: z.string(),
    festivals: z.array(z.string()).default([]),
    claims: z.array(reference('claims')).default([]),
    attestation: z.enum(['academic', 'community', 'oral-family']).optional(),
  }),
});

const lineageNodes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lineage-nodes' }),
  schema: z.object({
    slug: z.string(),
    level: z.enum(['varna', 'region', 'caste', 'title', 'kootam', 'village', 'deity']),
    parent: reference('lineage-nodes').optional(),
    name: z.string(),
    summary: z.string(),
    geo: z
      .object({
        lat: z.number(),
        lng: z.number(),
        zoom: z.number(),
      })
      .optional(),
    claims: z.array(reference('claims')).default([]),
  }),
});

const rituals = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/rituals' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    category: z.enum([
      'birth',
      'puberty',
      'marriage',
      'death',
      'kuladeivam',
      'kootam',
      'food',
      'purity',
      'other',
    ]),
    tradition_says: z.string(),
    evidence_says: z.string(),
    tier: z.enum(['green', 'yellow', 'red', 'rational']),
    rational_basis: z.string().optional(),
    relatedLineage: z.array(reference('lineage-nodes')).default([]),
    relatedPolicy: z.array(reference('claims')).default([]),
    claims: z.array(reference('claims')).default([]),
  }),
});

const timelineEvents = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,json}', base: './src/content/timeline-events' }),
  schema: z.object({
    slug: z.string(),
    year_start: z.number(),
    year_end: z.number().optional(),
    era: z.string(),
    title: z.string(),
    summary: z.string(),
    tier: z.enum(['green', 'yellow', 'red', 'rational']),
    sources: z.array(reference('sources')).default([]),
    category: z.enum([
      'political',
      'religious',
      'social',
      'genetic',
      'legal',
      'colonial',
      'other',
    ]),
  }),
});

export const collections = {
  sources,
  claims,
  kootams,
  deities,
  'lineage-nodes': lineageNodes,
  rituals,
  'timeline-events': timelineEvents,
};
