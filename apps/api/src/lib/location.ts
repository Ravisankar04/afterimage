import { createHash, randomBytes } from "node:crypto";
import { keccak256, stringToBytes } from "viem";

/**
 * Location privacy helpers.
 * PRIVATE: store only commitment = keccak256(lat|lng|salt); never expose preimage publicly.
 */
export function createLocationCommitment(lat: number, lng: number, salt?: string): {
  commitment: string;
  salt: string;
  saltHash: string;
} {
  const s = salt ?? randomBytes(32).toString("hex");
  const preimage = `${lat.toFixed(8)}|${lng.toFixed(8)}|${s}`;
  const commitment = keccak256(stringToBytes(preimage));
  const saltHash = createHash("sha256").update(s).digest("hex");
  return { commitment, salt: s, saltHash };
}

/** Coarse grid (~11km) for APPROXIMATE visibility. */
export function approximateCoords(lat: number, lng: number): {
  approximateLat: number;
  approximateLng: number;
  approximateLabel: string;
} {
  const approximateLat = Math.round(lat * 10) / 10;
  const approximateLng = Math.round(lng * 10) / 10;
  return {
    approximateLat,
    approximateLng,
    approximateLabel: `${approximateLat.toFixed(1)}, ${approximateLng.toFixed(1)}`,
  };
}

export function publicLocationView(input: {
  visibility: "PUBLIC" | "APPROXIMATE" | "PRIVATE";
  latitude: number | null;
  longitude: number | null;
  approximateLat: number | null;
  approximateLng: number | null;
  approximateLabel: string | null;
  locationCommitment: string | null;
}) {
  switch (input.visibility) {
    case "PUBLIC":
      return {
        visibility: "PUBLIC" as const,
        latitude: input.latitude,
        longitude: input.longitude,
        approximateLabel: input.approximateLabel,
        locationCommitment: null,
      };
    case "APPROXIMATE":
      return {
        visibility: "APPROXIMATE" as const,
        latitude: input.approximateLat,
        longitude: input.approximateLng,
        approximateLabel: input.approximateLabel,
        locationCommitment: null,
      };
    case "PRIVATE":
    default:
      return {
        visibility: "PRIVATE" as const,
        latitude: null,
        longitude: null,
        approximateLabel: null,
        locationCommitment: input.locationCommitment,
      };
  }
}
