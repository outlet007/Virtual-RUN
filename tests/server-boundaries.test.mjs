import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

async function sourceFiles(relativeDirectory) {
  const directory = path.join(projectRoot, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(relativePath)));
    if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) files.push(relativePath);
  }

  return files;
}

test("secret-bearing modules are guarded as server-only", async () => {
  const sensitiveModules = [
    "lib/email.ts",
    "lib/evidence-retention-service.ts",
    "lib/backend-settings-secrets.ts",
    "lib/integration-settings.ts",
    "lib/smtp-settings.ts",
    "lib/line.ts",
    "lib/ocr/run-evidence.ts",
    "lib/promptpay.ts",
    "lib/strava/api.ts",
    "lib/supabase/admin.ts",
    "lib/supabase/server.ts",
    "lib/turnstile.ts",
  ];

  for (const modulePath of sensitiveModules) {
    const source = await read(modulePath);
    assert.match(source, /^import "server-only";/, modulePath);
  }
});

test("client modules do not read server-only environment variables", async () => {
  const files = [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("components")),
    ...(await sourceFiles("lib")),
  ];

  for (const relativePath of files) {
    const source = await read(relativePath);
    if (!/^\s*["']use client["'];/m.test(source)) continue;

    const environmentNames = [...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(
      environmentNames.filter((name) => !name.startsWith("NEXT_PUBLIC_")),
      [],
      relativePath,
    );
  }
});

test("public environment names never imply elevated credentials", async () => {
  const envExample = await read(".env.example");
  const publicNames = [...envExample.matchAll(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)=/gm)].map(
    (match) => match[1],
  );

  for (const name of publicNames) {
    assert.doesNotMatch(name, /(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE|TOKEN)/, name);
  }

  const adminClient = await read("lib/supabase/admin.ts");
  assert.match(adminClient, /SUPABASE_SECRET_KEY/);
  assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(adminClient, /NEXT_PUBLIC_SUPABASE_(?:PUBLISHABLE|ANON)_KEY/);
});
