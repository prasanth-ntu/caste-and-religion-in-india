// Stage definitions for the V1 semantic-zoom map.
//
// Each stage corresponds to one level of the lineage tree, with a target
// projection center and zoom scale. The map's ZoomMap component swaps which
// boundary layers are drawn (states / TN-districts / Kongu-districts) and
// which pins are shown based on the active stage. Free pan/zoom is still
// available — these are *snap targets*, not hard locks.

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
  },
  {
    id: 'tamil-nadu',
    label: { en: 'Tamil Nadu', ta: 'தமிழ்நாடு' },
    center: [78.6, 11.0],
    zoom: 6,
    lineageSlug: 'tamil-nadu',
    description:
      'The Tamil-speaking state. Subdivided into Chola, Pandya, Tondai, and Kongu Nadus.',
  },
  {
    id: 'kongu',
    label: { en: 'Kongu Nadu', ta: 'கொங்கு நாடு' },
    center: [77.7, 11.2],
    zoom: 22,
    lineageSlug: 'kongu',
    description:
      'Western Tamil Nadu — seven districts straddling the Cauvery uplands.',
  },
  {
    id: 'konur',
    label: { en: 'Konur', ta: 'கோனூர்' },
    center: [78.0, 11.25],
    zoom: 110,
    lineageSlug: 'konur',
    description:
      'The Kadai-Kootam kuladeivam village — Konur Kaliamman temple as the emotional core.',
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
