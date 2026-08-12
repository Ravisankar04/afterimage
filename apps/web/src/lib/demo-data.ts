export type AfterimageStatus =
  | "ACTIVE"
  | "CHANGING"
  | "LAST_SEEN"
  | "GONE"
  | "CONTESTED";

export type AfterimageType =
  | "PLACES"
  | "OBJECTS"
  | "ART"
  | "EVENTS"
  | "PRODUCTS"
  | "SCIENCE"
  | "ARCHITECTURE";

export type TimelineEvent = {
  id: string;
  at: string;
  label: string;
  kind: "capture" | "witness" | "change" | "dispute" | "gone" | "record";
  note?: string;
};

export type EvidenceItem = {
  id: string;
  label: string;
  hash: string;
  mediaType: string;
  capturedAt: string;
};

export type Witness = {
  id: string;
  handle: string;
  address: string;
  attestedAt: string;
};

export type Dispute = {
  id: string;
  claim: string;
  status: "open" | "resolved" | "dismissed";
  filedAt: string;
};

export type Afterimage = {
  id: string;
  name: string;
  description: string;
  type: AfterimageType;
  status: AfterimageStatus;
  lat: number;
  lng: number;
  locationLabel: string;
  yearObserved: number;
  yearGone?: number;
  createdAt: string;
  evidenceCount: number;
  witnessCount: number;
  contentHash: string;
  /** Only set when a real on-chain tx exists; never invent hashes. */
  txHash: string | null;
  events: TimelineEvent[];
  evidence: EvidenceItem[];
  witnesses: Witness[];
  disputes: Dispute[];
  fieldX: number;
  fieldY: number;
  story: string[];
};

const H = (n: number) =>
  Array.from({ length: 64 }, (_, i) =>
    ((n * (i + 3) * 17 + i * 13) % 16).toString(16),
  ).join("");

export const DEMO_AFTERIMAGES: Afterimage[] = [
  {
    id: "ai-textile-01",
    name: "Old Textile Factory",
    description:
      "A brick mill that once hummed with looms. Demolished for mixed-use towers; the afterimage preserves the last operational day and the silence that followed.",
    type: "ARCHITECTURE",
    status: "GONE",
    lat: 41.8781,
    lng: -87.6298,
    locationLabel: "South Canal District",
    yearObserved: 2026,
    yearGone: 2028,
    createdAt: "2026-03-14T09:20:00.000Z",
    evidenceCount: 12,
    witnessCount: 7,
    contentHash: H(11),
    txHash: null,
    fieldX: 18,
    fieldY: 42,
    story: [
      "Steam rose from the loading bay every dawn.",
      "On March 14 the last shift clocked out.",
      "By autumn the crane arrived. The mill became air.",
    ],
    events: [
      {
        id: "e1",
        at: "2026-03-14T09:20:00.000Z",
        label: "First capture",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2026-06-02T16:00:00.000Z",
        label: "Seven witnesses signed",
        kind: "witness",
      },
      {
        id: "e3",
        at: "2027-11-18T11:30:00.000Z",
        label: "Scaffolding appears",
        kind: "change",
      },
      {
        id: "e4",
        at: "2028-02-01T08:00:00.000Z",
        label: "Structure erased",
        kind: "gone",
      },
      {
        id: "e5",
        at: "2028-02-01T08:05:00.000Z",
        label: "Afterimage sealed on-chain",
        kind: "record",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "North facade dawn",
        hash: H(31),
        mediaType: "image/jpeg",
        capturedAt: "2026-03-14T09:20:00.000Z",
      },
      {
        id: "ev2",
        label: "Loom hall audio",
        hash: H(32),
        mediaType: "audio/wav",
        capturedAt: "2026-03-14T10:02:00.000Z",
      },
      {
        id: "ev3",
        label: "Demolition permit scan",
        hash: H(33),
        mediaType: "application/pdf",
        capturedAt: "2027-10-01T12:00:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "mara.field",
        address: "0xA11C…91f2",
        attestedAt: "2026-06-02T16:00:00.000Z",
      },
      {
        id: "w2",
        handle: "j.ortiz",
        address: "0xB22D…44a1",
        attestedAt: "2026-06-02T16:04:00.000Z",
      },
    ],
    disputes: [],
  },
  {
    id: "ai-art-02",
    name: "Temporary Art Installation",
    description:
      "A kinetic light sculpture installed for forty-one nights. Only the hash of its final configuration remains when the plaza lights return to normal.",
    type: "ART",
    status: "LAST_SEEN",
    lat: 40.7128,
    lng: -74.006,
    locationLabel: "Harbor Plaza",
    yearObserved: 2027,
    createdAt: "2027-09-01T20:00:00.000Z",
    evidenceCount: 8,
    witnessCount: 19,
    contentHash: H(12),
    txHash: null,
    fieldX: 62,
    fieldY: 28,
    story: [
      "Night one: the plaza glowed amber.",
      "Night forty-one: the last pulse.",
      "Morning: scaffolding empty. Trace remains.",
    ],
    events: [
      {
        id: "e1",
        at: "2027-09-01T20:00:00.000Z",
        label: "Installation documented",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2027-10-11T23:50:00.000Z",
        label: "Final configuration hashed",
        kind: "record",
      },
      {
        id: "e3",
        at: "2027-10-12T06:00:00.000Z",
        label: "Deinstalled — last seen",
        kind: "gone",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Timelapse night 12",
        hash: H(41),
        mediaType: "video/mp4",
        capturedAt: "2027-09-12T22:00:00.000Z",
      },
      {
        id: "ev2",
        label: "Artist statement",
        hash: H(42),
        mediaType: "text/plain",
        capturedAt: "2027-09-01T18:00:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "lumen",
        address: "0xC33E…77b0",
        attestedAt: "2027-10-11T23:51:00.000Z",
      },
    ],
    disputes: [],
  },
  {
    id: "ai-theater-03",
    name: "Demolished Theater",
    description:
      "A 1920s cinema with a cracked marquee. Contested ownership delayed demolition; rival claims still dispute which interior photograph is authentic.",
    type: "PLACES",
    status: "CONTESTED",
    lat: 34.0522,
    lng: -118.2437,
    locationLabel: "West Vernacular Row",
    yearObserved: 2026,
    yearGone: 2029,
    createdAt: "2026-01-08T14:10:00.000Z",
    evidenceCount: 15,
    witnessCount: 11,
    contentHash: H(13),
    txHash: null,
    fieldX: 44,
    fieldY: 71,
    story: [
      "Tickets once tore at dusk.",
      "Two archives claim the balcony photo.",
      "The building is gone. The dispute is not.",
    ],
    events: [
      {
        id: "e1",
        at: "2026-01-08T14:10:00.000Z",
        label: "Facade capture",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2028-04-20T09:00:00.000Z",
        label: "Authenticity dispute filed",
        kind: "dispute",
        note: "Balcony still vs. balcony motion blur",
      },
      {
        id: "e3",
        at: "2029-05-03T10:00:00.000Z",
        label: "Demolition complete",
        kind: "gone",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Marquee dusk",
        hash: H(51),
        mediaType: "image/jpeg",
        capturedAt: "2026-01-08T14:10:00.000Z",
      },
      {
        id: "ev2",
        label: "Balcony A",
        hash: H(52),
        mediaType: "image/jpeg",
        capturedAt: "2026-02-01T11:00:00.000Z",
      },
      {
        id: "ev3",
        label: "Balcony B (contested)",
        hash: H(53),
        mediaType: "image/jpeg",
        capturedAt: "2026-02-01T11:05:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "projectionist",
        address: "0xD44F…12c9",
        attestedAt: "2026-03-01T12:00:00.000Z",
      },
    ],
    disputes: [
      {
        id: "d1",
        claim: "Balcony B is a composite; only Balcony A is original.",
        status: "open",
        filedAt: "2028-04-20T09:00:00.000Z",
      },
    ],
  },
  {
    id: "ai-market-04",
    name: "Pop-up Market",
    description:
      "A weekend market of ceramicists and seed sellers. Still active but relocating stalls weekly — the afterimage tracks the morphing footprint.",
    type: "EVENTS",
    status: "CHANGING",
    lat: 51.5074,
    lng: -0.1278,
    locationLabel: "Riverside Arcades",
    yearObserved: 2028,
    createdAt: "2028-05-17T08:00:00.000Z",
    evidenceCount: 6,
    witnessCount: 4,
    contentHash: H(14),
    txHash: null,
    fieldX: 78,
    fieldY: 55,
    story: [
      "Saturday: clay dust and citrus.",
      "Next Saturday: different pitch, same river wind.",
      "The market refuses a fixed shape.",
    ],
    events: [
      {
        id: "e1",
        at: "2028-05-17T08:00:00.000Z",
        label: "Initial footprint",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2028-08-03T09:00:00.000Z",
        label: "Stall layout change #4",
        kind: "change",
      },
      {
        id: "e3",
        at: "2029-01-11T09:00:00.000Z",
        label: "Witness refresh",
        kind: "witness",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Aerial stall map",
        hash: H(61),
        mediaType: "image/png",
        capturedAt: "2028-05-17T08:00:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "seed.seller",
        address: "0xE55A…88d3",
        attestedAt: "2029-01-11T09:00:00.000Z",
      },
    ],
    disputes: [],
  },
  {
    id: "ai-bridge-05",
    name: "Iron Footbridge",
    description:
      "A pedestrian bridge still in daily use. Documented as ACTIVE — the baseline against which future loss can be measured.",
    type: "ARCHITECTURE",
    status: "ACTIVE",
    lat: 48.8566,
    lng: 2.3522,
    locationLabel: "East Quay Span",
    yearObserved: 2029,
    createdAt: "2029-04-02T07:30:00.000Z",
    evidenceCount: 4,
    witnessCount: 3,
    contentHash: H(15),
    txHash: null,
    fieldX: 30,
    fieldY: 18,
    story: [
      "Rivets hold. Footsteps continue.",
      "An afterimage of the living is still an afterimage.",
    ],
    events: [
      {
        id: "e1",
        at: "2029-04-02T07:30:00.000Z",
        label: "Structural survey capture",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2029-04-02T08:00:00.000Z",
        label: "On-chain record",
        kind: "record",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Span mid-point",
        hash: H(71),
        mediaType: "image/jpeg",
        capturedAt: "2029-04-02T07:30:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "span.keeper",
        address: "0xF66B…01e4",
        attestedAt: "2029-04-02T07:45:00.000Z",
      },
    ],
    disputes: [],
  },
  {
    id: "ai-lab-06",
    name: "Cold Storage Lab Sample",
    description:
      "A research sample set scheduled for disposal after publication. Science that will not exist in physical form — only as an afterimage.",
    type: "SCIENCE",
    status: "ACTIVE",
    lat: 37.7749,
    lng: -122.4194,
    locationLabel: "Bay Research Annex",
    yearObserved: 2030,
    createdAt: "2030-02-20T15:00:00.000Z",
    evidenceCount: 9,
    witnessCount: 5,
    contentHash: H(16),
    txHash: null,
    fieldX: 55,
    fieldY: 48,
    story: [
      "The freezer hums at −80°C.",
      "When the paper publishes, the vials go.",
      "The hash stays.",
    ],
    events: [
      {
        id: "e1",
        at: "2030-02-20T15:00:00.000Z",
        label: "Sample set hashed",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2030-06-01T10:00:00.000Z",
        label: "Peer witnesses",
        kind: "witness",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Manifest CSV",
        hash: H(81),
        mediaType: "text/csv",
        capturedAt: "2030-02-20T15:00:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "dr.vale",
        address: "0x177C…55a8",
        attestedAt: "2030-06-01T10:00:00.000Z",
      },
    ],
    disputes: [],
  },
  {
    id: "ai-product-07",
    name: "Limited Run Chair",
    description:
      "A furniture piece produced in a run of forty. Two remain in circulation; the rest are scrap or private — the afterimage holds the original CNC path.",
    type: "PRODUCTS",
    status: "LAST_SEEN",
    lat: 52.52,
    lng: 13.405,
    locationLabel: "Workshop 4B",
    yearObserved: 2031,
    createdAt: "2031-07-09T12:00:00.000Z",
    evidenceCount: 5,
    witnessCount: 2,
    contentHash: H(17),
    txHash: null,
    fieldX: 12,
    fieldY: 66,
    story: [
      "Forty chairs left the shop.",
      "Thirty-eight vanished into rooms we cannot enter.",
    ],
    events: [
      {
        id: "e1",
        at: "2031-07-09T12:00:00.000Z",
        label: "CNC path archived",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2032-01-01T00:00:00.000Z",
        label: "Run declared complete",
        kind: "record",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Toolpath gcode",
        hash: H(91),
        mediaType: "text/plain",
        capturedAt: "2031-07-09T12:00:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "atelier",
        address: "0x288D…66b9",
        attestedAt: "2031-07-09T12:30:00.000Z",
      },
    ],
    disputes: [],
  },
  {
    id: "ai-object-08",
    name: "Signal Buoy #17",
    description:
      "A coastal buoy that drifted off-grid. Object status oscillating between CHANGING and LAST_SEEN as telemetry flickers.",
    type: "OBJECTS",
    status: "CHANGING",
    lat: 55.6761,
    lng: 12.5683,
    locationLabel: "North Channel",
    yearObserved: 2032,
    createdAt: "2032-03-03T04:00:00.000Z",
    evidenceCount: 3,
    witnessCount: 1,
    contentHash: H(18),
    txHash: null,
    fieldX: 88,
    fieldY: 22,
    story: [
      "Beacon. Silence. Beacon again.",
      "The sea edits the record in real time.",
    ],
    events: [
      {
        id: "e1",
        at: "2032-03-03T04:00:00.000Z",
        label: "Last reliable ping",
        kind: "capture",
      },
      {
        id: "e2",
        at: "2033-08-14T19:20:00.000Z",
        label: "Position drift logged",
        kind: "change",
      },
    ],
    evidence: [
      {
        id: "ev1",
        label: "Telemetry dump",
        hash: H(101),
        mediaType: "application/json",
        capturedAt: "2032-03-03T04:00:00.000Z",
      },
    ],
    witnesses: [
      {
        id: "w1",
        handle: "harbor",
        address: "0x399E…77c0",
        attestedAt: "2032-03-03T05:00:00.000Z",
      },
    ],
    disputes: [],
  },
];

export const TYPE_FILTERS: Array<"ALL" | AfterimageType> = [
  "ALL",
  "PLACES",
  "OBJECTS",
  "ART",
  "EVENTS",
  "PRODUCTS",
  "SCIENCE",
  "ARCHITECTURE",
];

export const STATUS_ORDER: AfterimageStatus[] = [
  "ACTIVE",
  "CHANGING",
  "LAST_SEEN",
  "GONE",
  "CONTESTED",
];

export function getDemoById(id: string): Afterimage | undefined {
  return DEMO_AFTERIMAGES.find((a) => a.id === id);
}
