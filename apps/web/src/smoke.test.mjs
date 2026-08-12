import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("AFTERIMAGE web smoke", () => {
  it("package identity is the archive product", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.name, "@afterimage/web");
    assert.ok(pkg.dependencies?.next, "Next.js required");
    assert.ok(pkg.dependencies?.three, "Three.js required for Field / hero");
  });

  it("exposes a test script for CI gating", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(typeof pkg.scripts?.test, "string");
  });
});
