import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const callbackRoute = fs.readFileSync("app/auth/callback/route.ts", "utf8");
const dashboardLayout = fs.readFileSync("app/(dashboard)/layout.tsx", "utf8");
const consentPage = fs.readFileSync("app/consent/page.tsx", "utf8");
const authActions = fs.readFileSync("lib/actions/auth.ts", "utf8");

test("consent lookups tolerate historical duplicate rows", () => {
  for (const source of [callbackRoute, dashboardLayout, consentPage]) {
    assert.match(
      source,
      /\.eq\("type", "privacy"\)[\s\S]*?\.limit\(1\)[\s\S]*?\.maybeSingle\(\)/,
    );
  }
});

test("acceptConsent reports a failed consent insert before redirecting", () => {
  const acceptConsent = authActions.match(
    /export async function acceptConsent[\s\S]*?\n}\n/,
  )?.[0];

  assert.ok(acceptConsent, "acceptConsent action must exist");
  assert.match(acceptConsent, /const \{ error: consentError \} = await supabase/);
  assert.match(acceptConsent, /console\.error\("Consent insert failed"/);
  assert.match(
    acceptConsent,
    /if \(consentError\)[\s\S]*?redirect\([\s\S]*?"\/consent\?error="/,
  );
});
