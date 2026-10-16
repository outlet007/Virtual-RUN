import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");

test("social OAuth redirects use the browser-reachable Supabase URL", async () => {
  for (const relativePath of [
    "app/auth/google/route.ts",
    "app/auth/facebook/route.ts",
  ]) {
    const source = await readFile(path.join(projectRoot, relativePath), "utf8");

    assert.match(
      source,
      /import\s+{\s*toPublicSupabaseUrl\s*}\s+from\s+["']@\/lib\/supabase\/public-url["']/,
      relativePath,
    );
    assert.match(
      source,
      /NextResponse\.redirect\(toPublicSupabaseUrl\(data\.url\)\)/,
      relativePath,
    );
  }
});
