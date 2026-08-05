import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_OCR_OUTPUT = 2 * 1024 * 1024;
const MAX_RAW_TEXT = 4000;

type OcrWord = {
  lineKey: string;
  confidence: number;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type OcrLine = {
  text: string;
  confidence: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type RunEvidenceOcrResult = {
  status: "matched" | "mismatch" | "unreadable" | "error";
  distanceKm: number | null;
  confidence: number | null;
  rawText: string | null;
};

export function parseTsv(tsv: string): OcrLine[] {
  const words: OcrWord[] = [];
  for (const row of tsv.split(/\r?\n/).slice(1)) {
    const columns = row.split("\t");
    if (columns.length < 12 || columns[0] !== "5") continue;
    const text = columns.slice(11).join("\t").trim();
    const confidence = Number(columns[10]);
    const left = Number(columns[6]);
    const top = Number(columns[7]);
    const width = Number(columns[8]);
    const height = Number(columns[9]);
    if (
      !text ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      ![left, top, width, height].every(Number.isFinite)
    ) continue;
    words.push({
      lineKey: columns.slice(1, 5).join(":"),
      confidence,
      text,
      left,
      top,
      width,
      height,
    });
  }

  const grouped = new Map<string, OcrWord[]>();
  for (const word of words) {
    const line = grouped.get(word.lineKey) ?? [];
    line.push(word);
    grouped.set(word.lineKey, line);
  }

  return [...grouped.values()]
    .map((lineWords) => {
      const left = Math.min(...lineWords.map((word) => word.left));
      const top = Math.min(...lineWords.map((word) => word.top));
      const right = Math.max(...lineWords.map((word) => word.left + word.width));
      const bottom = Math.max(...lineWords.map((word) => word.top + word.height));

      return {
        text: lineWords.map((word) => word.text).join(" "),
        confidence:
          lineWords.reduce((sum, word) => sum + word.confidence, 0) / lineWords.length,
        left,
        top,
        width: right - left,
        height: bottom - top,
      };
    })
    .sort((a, b) => a.top - b.top || a.left - b.left);
}

export function extractDistance(lines: OcrLine[], allowUnitlessFallback = false) {
  const candidates: Array<{ distance: number; confidence: number; score: number }> = [];
  const unitlessCandidates: Array<{
    distance: number;
    confidence: number;
    score: number;
  }> = [];

  for (const line of lines) {
    const normalized = line.text
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/[|]/g, " ")
      .trim();
    const hasDistanceLabel = /distance|ระยะ(?!\s*เวลา)/i.test(normalized);
    const hasUnit = /\bkm\b|ก\.?\s*ม\.?|kilomet(?:er|re)/i.test(normalized);
    const looksLikeOtherMetric =
      /\b(?:kcal|cal|bpm|steps?|mi(?:le)?s?)\b|แคลอรี|ก้าว|ไมล์|ระยะเวลา/i.test(normalized);
    const looksLikeTimeOrDate =
      /\b\d{1,2}:\d{2}(?::\d{2})?\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(normalized);

    if ((hasDistanceLabel || hasUnit) && !(looksLikeTimeOrDate && !hasUnit)) {
      const unitMatches = [
        ...normalized.matchAll(
          /(\d{1,4}(?:\.\d{1,3})?)\s*(?:km\b|ก\.?\s*ม\.?|kilomet(?:er|re))/gi,
        ),
      ];
      const numberMatches =
        unitMatches.length > 0
          ? unitMatches
          : [...normalized.matchAll(/\d{1,4}(?:\.\d{1,3})?/g)];

      for (const match of numberMatches) {
        const distance = Number(match[1] ?? match[0]);
        if (!Number.isFinite(distance) || distance < 0.1 || distance > 1000) continue;
        candidates.push({
          distance,
          confidence: line.confidence,
          score:
            10_000 +
            (hasDistanceLabel ? 300 : 0) +
            (hasUnit ? 400 : 0) +
            (distance % 1 ? 100 : 0) +
            line.height,
        });
      }
    }

    if (
      allowUnitlessFallback &&
      !hasDistanceLabel &&
      !hasUnit &&
      !looksLikeOtherMetric &&
      !looksLikeTimeOrDate
    ) {
      // Some fitness apps render the large distance and its Thai unit as
      // separate visual elements. Tesseract can lose "กม." and leave its
      // punctuation behind, producing values such as "8.3." or "8.12..".
      const isolatedDecimal = normalized.match(
        /^\s*(\d{1,3}\.\d{1,3})\s*[.,]{0,3}\s*$/,
      );
      if (isolatedDecimal) {
        const distance = Number(isolatedDecimal[1]);
        if (Number.isFinite(distance) && distance >= 0.1 && distance <= 1000) {
          unitlessCandidates.push({
            distance,
            confidence: line.confidence,
            score: line.height * 10 + line.confidence,
          });
        }
      }
    }
  }

  const strongCandidate = candidates.sort(
    (a, b) => b.score - a.score || b.confidence - a.confidence,
  )[0];
  if (strongCandidate) return strongCandidate;

  return unitlessCandidates.sort(
    (a, b) => b.score - a.score || b.confidence - a.confidence,
  )[0] ?? null;
}

async function recognizeLines(imagePath: string, pageSegmentationMode: 6 | 11) {
  const { stdout } = await execFileAsync(
    "tesseract",
    [
      imagePath,
      "stdout",
      "-l",
      "eng+tha",
      "--psm",
      String(pageSegmentationMode),
      "tsv",
    ],
    {
      encoding: "utf8",
      maxBuffer: MAX_OCR_OUTPUT,
      timeout: 45_000,
      env: { ...process.env, OMP_THREAD_LIMIT: "1" },
    },
  );

  return parseTsv(stdout);
}

export function compareOcrDistance(
  enteredDistanceKm: number,
  ocrDistanceKm: number | null,
) {
  if (ocrDistanceKm === null) return false;
  const toleranceKm = Math.max(0.05, enteredDistanceKm * 0.01);
  return Math.abs(enteredDistanceKm - ocrDistanceKm) <= toleranceKm;
}

export async function readRunEvidence(
  image: Buffer,
  extension: "png" | "jpg" | "webp",
  enteredDistanceKm: number,
): Promise<RunEvidenceOcrResult> {
  const workDir = await mkdtemp(path.join(tmpdir(), "virtual-run-ocr-"));
  const imagePath = path.join(workDir, `evidence.${extension}`);

  try {
    await writeFile(imagePath, image);
    const primaryLines = await recognizeLines(imagePath, 6);
    let lines = primaryLines;
    let candidate = extractDistance(primaryLines);

    if (!candidate) {
      try {
        const sparseLines = await recognizeLines(imagePath, 11);
        lines = sparseLines.length > 0 ? sparseLines : primaryLines;
        candidate = extractDistance(sparseLines, true);
      } catch {
        // Keep the primary OCR result when the optional sparse pass fails.
      }
    }

    const rawText = lines.map((line) => line.text).join("\n").slice(0, MAX_RAW_TEXT) || null;
    if (!candidate) {
      return { status: "unreadable", distanceKm: null, confidence: null, rawText };
    }

    const distanceKm = Math.round(candidate.distance * 100) / 100;
    return {
      status: compareOcrDistance(enteredDistanceKm, distanceKm) ? "matched" : "mismatch",
      distanceKm,
      confidence: Math.round(candidate.confidence * 100) / 100,
      rawText,
    };
  } catch {
    return { status: "error", distanceKm: null, confidence: null, rawText: null };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
