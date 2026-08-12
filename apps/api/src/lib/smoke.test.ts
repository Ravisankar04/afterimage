import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INSUFFICIENT_EVIDENCE_MESSAGE } from "../ai/memory-engine.js";
import { createLocationCommitment, publicLocationView } from "../lib/location.js";

describe("AFTERIMAGE API smoke", () => {
  it("exposes an explicit insufficient-evidence message (never fabricate)", () => {
    assert.match(INSUFFICIENT_EVIDENCE_MESSAGE, /INSUFFICIENT EVIDENCE/);
    assert.match(INSUFFICIENT_EVIDENCE_MESSAGE, /No claim was fabricated/);
  });

  it("keeps PRIVATE location preimages out of public views", () => {
    const { commitment, salt } = createLocationCommitment(13.0827, 80.2707);
    assert.ok(commitment.startsWith("0x"));
    assert.ok(salt.length > 0);

    const view = publicLocationView({
      visibility: "PRIVATE",
      latitude: 13.0827,
      longitude: 80.2707,
      approximateLat: 13.1,
      approximateLng: 80.3,
      approximateLabel: "13.1, 80.3",
      locationCommitment: commitment,
    });

    assert.equal(view.latitude, null);
    assert.equal(view.longitude, null);
    assert.equal(view.locationCommitment, commitment);
  });
});
