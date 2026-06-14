// Stage definitions for the V1 semantic-zoom map.
//
// Each stage corresponds to one level of the lineage tree, with a target
// projection center and zoom scale. The map's ZoomMap component swaps which
// boundary layers are drawn (states / TN-districts / Kongu-districts) and
// which pins are shown based on the active stage. Free pan/zoom is still
// available — these are *snap targets*, not hard locks.

import type { ManifestEntry } from '../components/LineageSelector';

export type StageId = 'india' | 'tamil-nadu' | 'kongu' | 'konur';

export type PinType = 'capital' | 'district' | 'village' | 'temple';

export interface MapPin {
  lng: number;
  lat: number;
  label: string;
  labelTa?: string;
  type: PinType;
  /** Stages at which this pin should be visible. */
  visibleFrom: StageId;
}

export interface ZoomStage {
  id: StageId;
  label: { en: string; ta: string };
  /** [lng, lat] projection center for snap. */
  center: [number, number];
  /** d3.zoom scale factor used when snapping to this stage. */
  zoom: number;
  /** Slug of the corresponding lineage-node content collection entry. */
  lineageSlug: string;
  /** Short prose used in the breadcrumb / focused-stage card. */
  description: string;
  /** Caption shown during the auto-advance "Tell me the story" mode. */
  narrativeCaption?: string;
}

export const stages: ZoomStage[] = [
  {
    id: 'india',
    label: { en: 'India', ta: 'இந்தியா' },
    center: [82.0, 22.5],
    zoom: 1,
    lineageSlug: 'india',
    description:
      'The civilisational frame — 1.4 billion people, four notional varnas, thousands of jatis.',
    narrativeCaption:
      'We start with India — 1.4 billion people, four notional varnas, and thousands of jatis stitched into a single subcontinent.',
  },
  {
    id: 'tamil-nadu',
    label: { en: 'Tamil Nadu', ta: 'தமிழ்நாடு' },
    center: [78.6, 11.0],
    zoom: 6,
    lineageSlug: 'tamil-nadu',
    description:
      'The Tamil-speaking state. Subdivided into Chola, Pandya, Tondai, and Kongu Nadus.',
    narrativeCaption:
      'Zoom into Tamil Nadu — a Tamil-speaking state historically split into Chola, Pandya, Tondai, and Kongu Nadus.',
  },
  {
    id: 'kongu',
    label: { en: 'Kongu Nadu', ta: 'கொங்கு நாடு' },
    center: [77.7, 11.2],
    zoom: 22,
    lineageSlug: 'kongu',
    description:
      'Western Tamil Nadu — seven districts straddling the Cauvery uplands.',
    narrativeCaption:
      'Now Kongu Nadu — the western seven districts straddling the Cauvery uplands, homeland of the Kongu Vellala Gounders.',
  },
  {
    id: 'konur',
    label: { en: 'Konur', ta: 'கோனூர்' },
    center: [78.0, 11.25],
    zoom: 110,
    lineageSlug: 'konur',
    description:
      'The Kadai-Kootam kuladeivam village — Konur Kaliamman temple as the emotional core.',
    narrativeCaption:
      'And finally Konur — the Kadai-Kootam kuladeivam village, with Konur Kaliamman temple as the emotional core of this lineage.',
  },
];

/** Convenience map for lookup by stage id. */
export const stagesById: Record<StageId, ZoomStage> = Object.fromEntries(
  stages.map((s) => [s.id, s]),
) as Record<StageId, ZoomStage>;

// ---------------- Pin catalogue ----------------
// State capitals (a few illustrative dots so the India view isn't blank).
export const stateCapitals: MapPin[] = [
  { lng: 77.21, lat: 28.6139, label: 'Delhi', type: 'capital', visibleFrom: 'india' },
  { lng: 72.8777, lat: 19.076, label: 'Mumbai', type: 'capital', visibleFrom: 'india' },
  { lng: 88.3639, lat: 22.5726, label: 'Kolkata', type: 'capital', visibleFrom: 'india' },
  { lng: 80.2707, lat: 13.0827, label: 'Chennai', type: 'capital', visibleFrom: 'india' },
  { lng: 77.5946, lat: 12.9716, label: 'Bengaluru', type: 'capital', visibleFrom: 'india' },
  { lng: 78.4867, lat: 17.385, label: 'Hyderabad', type: 'capital', visibleFrom: 'india' },
  { lng: 76.2673, lat: 9.9312, label: 'Kochi', type: 'capital', visibleFrom: 'india' },
];

// 7 Kongu districts — centroids approximate.
export const konguDistrictPins: MapPin[] = [
  { lng: 76.9558, lat: 11.0168, label: 'Coimbatore', labelTa: 'கோயம்புத்தூர்', type: 'district', visibleFrom: 'tamil-nadu' },
  { lng: 77.7172, lat: 11.341, label: 'Erode', labelTa: 'ஈரோடு', type: 'district', visibleFrom: 'tamil-nadu' },
  { lng: 77.3411, lat: 11.1085, label: 'Tiruppur', labelTa: 'திருப்பூர்', type: 'district', visibleFrom: 'tamil-nadu' },
  { lng: 78.146, lat: 11.6643, label: 'Salem', labelTa: 'சேலம்', type: 'district', visibleFrom: 'tamil-nadu' },
  { lng: 78.1674, lat: 11.2189, label: 'Namakkal', labelTa: 'நாமக்கல்', type: 'district', visibleFrom: 'tamil-nadu' },
  { lng: 78.0766, lat: 10.9601, label: 'Karur', labelTa: 'கரூர்', type: 'district', visibleFrom: 'tamil-nadu' },
  { lng: 78.1582, lat: 12.1211, label: 'Dharmapuri', labelTa: 'தர்மபுரி', type: 'district', visibleFrom: 'tamil-nadu' },
];

// The personal pin — Konur Kaliamman temple, Namakkal district.
export const konurTemplePin = {
  lng: 78.0,
  lat: 11.25,
  label: 'Konur Kaliamman',
  labelTa: 'கோனூர் காளியம்மன்',
  type: 'temple' as const,
  visibleFrom: 'kongu' as const,
  deity: 'Konur Kaliamman',
  deityTa: 'கோனூர் காளியம்மன்',
  village: 'Konur',
  villageTa: 'கோனூர்',
  href: '/lineage/konur',
} satisfies MapPin & { deity: string; deityTa: string; village: string; villageTa: string; href: string };

export const allPins: MapPin[] = [
  ...stateCapitals,
  ...konguDistrictPins,
  konurTemplePin,
];

// ---------------- Lineage-aware stage factory ----------------

export interface KootamStageBundle {
  stages: ZoomStage[];
  templePin: typeof konurTemplePin | null;
  isAuthorExample: boolean;
  /** Optional "village pin pending" caption when documented but coords missing. */
  pendingVillage?: { name: string; deityName: string };
  /** Display name of the kootam (for TemplePopover). */
  kootamName?: string;
  /** Totem label for TemplePopover. */
  totemLabel?: string;
}

/**
 * Returns the appropriate stage set and temple pin for a given manifest entry.
 *
 * - Kadai (or null/missing): existing Konur stages + pin, isAuthorExample: false.
 * - Documented kootam with lng/lat on deity: custom final stage + pin (inert until coords land).
 * - Documented kootam without coords (Maniyan/Senganni/Vilayan today): 3 stages, no pin, pendingVillage.
 * - Stub / undocumented: Konur pin + stages, isAuthorExample: true.
 */
export function buildStagesForKootam(entry: ManifestEntry | null): KootamStageBundle {
  // Default: Kadai (no selection, missing slug, or explicit Kadai)
  if (!entry || entry.slug === 'kadai') {
    return {
      stages,
      templePin: konurTemplePin,
      isAuthorExample: false,
      kootamName: 'Kadai',
      totemLabel: 'Quail (காடை)',
    };
  }

  // Documented kootam with deity coords — NOT applicable this round (no entries have coords yet).
  // Pattern: check entry.deity?.lng && entry.deity?.lat, swap final stage center + templePin.
  // This branch will activate automatically once Part D research returns coords.
  const lng = (entry.deity as any)?.lng;
  const lat = (entry.deity as any)?.lat;
  if (entry.status === 'documented' && entry.deity && typeof lng === 'number' && typeof lat === 'number') {
    const village = entry.deity.village ?? 'village';
    const deityName = entry.deity.name;
    const newFinal: ZoomStage = {
      id: 'konur', // reuse the id slot; semantically it's the kuladeivam village
      label: { en: village, ta: '' },
      center: [lng, lat],
      zoom: 110,
      lineageSlug: entry.slug,
      description: `${deityName} — the ${entry.name} kuladeivam temple.`,
      narrativeCaption: `And finally ${village} — the ${entry.name} kuladeivam village, with ${deityName} as the emotional core of this lineage.`,
    };
    const customPin = {
      ...konurTemplePin,
      lng,
      lat,
      label: deityName,
      labelTa: entry.deity.tamilName ?? '',
      deity: deityName,
      deityTa: entry.deity.tamilName ?? '',
      village,
      villageTa: '',
      href: `/lineage/k/${entry.slug}/`,
    } as typeof konurTemplePin;
    return {
      stages: [stages[0], stages[1], stages[2], newFinal],
      templePin: customPin,
      isAuthorExample: false,
      kootamName: entry.name,
      totemLabel: entry.tamilName,
    };
  }

  // Documented but no coords (e.g. Maniyan/Senganni/Vilayan today): final stage = Kongu, no village pin.
  if (entry.status === 'documented' && entry.deity) {
    return {
      stages: [stages[0], stages[1], stages[2]], // 3 stages, no village snap
      templePin: null,
      isAuthorExample: false,
      pendingVillage: {
        name: entry.deity.village ?? 'their kuladeivam village',
        deityName: entry.deity.name,
      },
      kootamName: entry.name,
      totemLabel: entry.tamilName,
    };
  }

  // Stub / undocumented — keep Konur as the worked example.
  return {
    stages,
    templePin: konurTemplePin,
    isAuthorExample: true,
    kootamName: 'Kadai',
    totemLabel: 'Quail (காடை)',
  };
}
