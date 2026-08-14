import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  createEvidenceFingerprint,
  detectEvidenceDuplicate,
  hammingDistanceHex,
  prepareEvidenceImage,
} from "../lib/evidence-fingerprint.ts";

async function createBaseImage() {
  const width = 800;
  const height = 500;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      const inSun = (x - 620) ** 2 + (y - 115) ** 2 < 70 ** 2;
      const inPanel = x >= 80 && x <= 380 && y >= 60 && y <= 155;
      const inMountain = y > 330 - Math.abs((x % 300) - 150) * 0.75;
      const inTextStripe = inPanel && y >= 95 && y <= 125 && x % 55 < 30;
      const color = inTextStripe
        ? [19, 41, 61]
        : inPanel
          ? [245, 248, 250]
          : inSun
            ? [255, 209, 102]
            : inMountain
              ? [23, 63, 95]
              : [20 + Math.floor((x / width) * 120), 107 + Math.floor((y / height) * 90), 140];
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}
test("global SHA-256 is identical for a renamed file across accounts", async () => {
  const original = await createBaseImage();
  const firstAccount = await createEvidenceFingerprint(original);
  const secondAccountRenamed = await createEvidenceFingerprint(Buffer.from(original));

  const match = detectEvidenceDuplicate(secondAccountRenamed, [
    { id: "first-account-submission", ...firstAccount },
  ]);

  assert.equal(match?.type, "exact");
  assert.equal(match?.hardBlock, true);
});

test("normalized SHA-256 ignores metadata-only changes", async () => {
  const original = await createBaseImage();
  const withMetadata = await sharp(original)
    .withMetadata({ comment: "different upload metadata" })
    .png()
    .toBuffer();
  const originalFingerprint = await createEvidenceFingerprint(original);
  const metadataFingerprint = await createEvidenceFingerprint(withMetadata);

  assert.notEqual(metadataFingerprint.sha256, originalFingerprint.sha256);
  assert.equal(metadataFingerprint.normalizedSha256, originalFingerprint.normalizedSha256);
  assert.equal(
    detectEvidenceDuplicate(metadataFingerprint, [
      { id: "original", ...originalFingerprint },
    ])?.type,
    "normalized",
  );
});

test("perceptual hash flags a recompressed image", async () => {
  const original = await createBaseImage();
  const recompressed = await sharp(original).jpeg({ quality: 62 }).toBuffer();
  const originalFingerprint = await createEvidenceFingerprint(original);
  const recompressedFingerprint = await createEvidenceFingerprint(recompressed);
  const distance = hammingDistanceHex(originalFingerprint.phash, recompressedFingerprint.phash);

  assert.notEqual(recompressedFingerprint.sha256, originalFingerprint.sha256);
  assert.ok(distance <= 10, `expected distance <= 10, received ${distance}`);
  assert.equal(
    detectEvidenceDuplicate(recompressedFingerprint, [
      { id: "original", ...originalFingerprint },
    ])?.type,
    "perceptual",
  );
});

test("perceptual hash flags a lightly cropped image", async () => {
  const original = await createBaseImage();
  const cropped = await sharp(original)
    .extract({ left: 20, top: 12, width: 760, height: 476 })
    .resize(800, 500)
    .jpeg({ quality: 82 })
    .toBuffer();
  const originalFingerprint = await createEvidenceFingerprint(original);
  const croppedFingerprint = await createEvidenceFingerprint(cropped);
  const distance = hammingDistanceHex(originalFingerprint.phash, croppedFingerprint.phash);

  assert.ok(distance <= 10, `expected distance <= 10, received ${distance}`);
});

test("unrelated images are not flagged as perceptual duplicates", async () => {
  const original = await createBaseImage();
  const width = 800;
  const height = 500;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      const checker = (Math.floor(x / 50) + Math.floor(y / 50)) % 2 === 0;
      pixels[offset] = checker ? 247 : 46;
      pixels[offset + 1] = checker ? 197 : 64;
      pixels[offset + 2] = checker ? 72 : 87;
    }
  }
  const unrelated = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  const originalFingerprint = await createEvidenceFingerprint(original);
  const unrelatedFingerprint = await createEvidenceFingerprint(unrelated);

  assert.equal(
    detectEvidenceDuplicate(unrelatedFingerprint, [
      { id: "original", ...originalFingerprint },
    ]),
    null,
  );
});

test("prepared evidence is decoded and re-encoded as metadata-free JPEG", async () => {
  const original = await sharp(await createBaseImage())
    .withMetadata({ comment: "must not survive storage preparation" })
    .png()
    .toBuffer();
  const prepared = await prepareEvidenceImage(original);
  const metadata = await sharp(prepared.storageBuffer).metadata();

  assert.equal(prepared.storageContentType, "image/jpeg");
  assert.equal(prepared.storageExtension, "jpg");
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.comments, undefined);
  assert.match(prepared.fingerprint.sha256, /^[0-9a-f]{64}$/);
});
