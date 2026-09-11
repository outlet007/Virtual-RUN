import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("components/ui/image-upload-field.tsx", "utf8");

test("logo preview stops reserving the full row at the horizontal breakpoint", () => {
  assert.match(
    source,
    /previewVariant === "logo"\s*\? "w-full max-w-56 bg-white object-contain p-1 sm:w-40"/,
  );
  assert.match(
    source,
    /previewVariant === "logo" \? "w-full max-w-56 sm:w-40" : "w-16"/,
  );
});

test("standard image upload button cannot be flex-shrunk or wrap its label", () => {
  const standardField = source.slice(source.lastIndexOf("previewVariant === \"logo\""));
  assert.match(
    standardField,
    /<label className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap/,
  );
});
