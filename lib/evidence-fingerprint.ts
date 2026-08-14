import { createHash } from "node:crypto";
import sharp from "sharp";

const NORMALIZED_SIZE = 512;
const PHASH_SAMPLE_SIZE = 32;
const PHASH_LOW_FREQUENCY_SIZE = 8;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_STORED_DIMENSION = 4096;
const MAX_STORED_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
const DCT_COSINES = Array.from(
  { length: PHASH_LOW_FREQUENCY_SIZE },
  (_, frequency) =>
    Array.from({ length: PHASH_SAMPLE_SIZE }, (_, position) =>
      Math.cos(
        ((2 * position + 1) * frequency * Math.PI) / (2 * PHASH_SAMPLE_SIZE),
      ),
    ),
);

export const DEFAULT_PHASH_DISTANCE_THRESHOLD = 10;

export type EvidenceFingerprint = {
  sha256: string;
  normalizedSha256: string;
  phash: string;
};

export type EvidenceFingerprintCandidate = EvidenceFingerprint & {
  id: string;
};

export type PreparedEvidenceImage = {
  fingerprint: EvidenceFingerprint;
  storageBuffer: Buffer;
  storageExtension: "jpg";
  storageContentType: "image/jpeg";
};

export type EvidenceDuplicateMatch = {
  id: string;
  type: "exact" | "normalized" | "perceptual";
  distance: number;
  hardBlock: boolean;
} | null;

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function calculatePerceptualHash(pixels: Buffer) {
  if (pixels.length !== PHASH_SAMPLE_SIZE * PHASH_SAMPLE_SIZE) {
    throw new Error("Unexpected perceptual hash sample size");
  }

  const coefficients: number[] = [];
  for (let vertical = 0; vertical < PHASH_LOW_FREQUENCY_SIZE; vertical += 1) {
    for (let horizontal = 0; horizontal < PHASH_LOW_FREQUENCY_SIZE; horizontal += 1) {
      let coefficient = 0;
      for (let y = 0; y < PHASH_SAMPLE_SIZE; y += 1) {
        for (let x = 0; x < PHASH_SAMPLE_SIZE; x += 1) {
          coefficient +=
            pixels[y * PHASH_SAMPLE_SIZE + x] *
            DCT_COSINES[horizontal][x] *
            DCT_COSINES[vertical][y];
        }
      }
      coefficients.push(coefficient);
    }
  }

  const threshold = median(coefficients.slice(1));
  let bits = 0n;
  coefficients.forEach((coefficient, index) => {
    if (coefficient > threshold) bits |= 1n << BigInt(63 - index);
  });
  return bits.toString(16).padStart(16, "0");
}

export function hammingDistanceHex(left: string, right: string) {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) {
    throw new Error("Perceptual hashes must be 16 hexadecimal characters");
  }

  let difference = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (difference > 0n) {
    difference &= difference - 1n;
    distance += 1;
  }
  return distance;
}

export function detectEvidenceDuplicate(
  fingerprint: EvidenceFingerprint,
  candidates: EvidenceFingerprintCandidate[],
  perceptualThreshold = DEFAULT_PHASH_DISTANCE_THRESHOLD,
): EvidenceDuplicateMatch {
  const exact = candidates.find((candidate) => candidate.sha256 === fingerprint.sha256);
  if (exact) return { id: exact.id, type: "exact", distance: 0, hardBlock: true };

  const normalized = candidates.find(
    (candidate) => candidate.normalizedSha256 === fingerprint.normalizedSha256,
  );
  if (normalized) {
    return { id: normalized.id, type: "normalized", distance: 0, hardBlock: false };
  }

  const closest = candidates
    .map((candidate) => ({
      candidate,
      distance: hammingDistanceHex(fingerprint.phash, candidate.phash),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (closest && closest.distance <= perceptualThreshold) {
    return {
      id: closest.candidate.id,
      type: "perceptual",
      distance: closest.distance,
      hardBlock: false,
    };
  }
  return null;
}

export async function createEvidenceFingerprint(
  imageBuffer: Buffer,
): Promise<EvidenceFingerprint> {
  const inputOptions = {
    failOn: "warning" as const,
    limitInputPixels: MAX_INPUT_PIXELS,
    pages: 1,
  };

  const normalizedPixels = await sharp(imageBuffer, inputOptions)
    .autoOrient()
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .resize(NORMALIZED_SIZE, NORMALIZED_SIZE, {
      fit: "contain",
      background: "#ffffff",
      kernel: sharp.kernel.lanczos3,
    })
    .removeAlpha()
    .raw()
    .toBuffer();

  const perceptualPixels = await sharp(imageBuffer, inputOptions)
    .autoOrient()
    .flatten({ background: "#ffffff" })
    .greyscale()
    .resize(PHASH_SAMPLE_SIZE, PHASH_SAMPLE_SIZE, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .raw()
    .toBuffer();

  return {
    sha256: sha256(imageBuffer),
    normalizedSha256: sha256(normalizedPixels),
    phash: calculatePerceptualHash(perceptualPixels),
  };
}

export async function prepareEvidenceImage(
  imageBuffer: Buffer,
): Promise<PreparedEvidenceImage> {
  const inputOptions = {
    failOn: "warning" as const,
    limitInputPixels: MAX_INPUT_PIXELS,
    pages: 1,
  };
  const metadata = await sharp(imageBuffer, inputOptions).metadata();
  if (
    !metadata.format ||
    !ALLOWED_IMAGE_FORMATS.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error("Unsupported evidence image format");
  }

  const [fingerprint, storageBuffer] = await Promise.all([
    createEvidenceFingerprint(imageBuffer),
    sharp(imageBuffer, inputOptions)
      .autoOrient()
      .flatten({ background: "#ffffff" })
      .toColourspace("srgb")
      .resize(MAX_STORED_DIMENSION, MAX_STORED_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer(),
  ]);

  if (storageBuffer.length > MAX_STORED_BYTES) {
    throw new Error("Prepared evidence image exceeds storage limit");
  }

  return {
    fingerprint,
    storageBuffer,
    storageExtension: "jpg",
    storageContentType: "image/jpeg",
  };
}
