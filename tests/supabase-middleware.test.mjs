import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  isInvalidRefreshTokenError,
  isSupabaseAuthCookieName,
} from "../lib/supabase/auth-errors.ts";
import { SUPABASE_AUTH_COOKIE_NAME } from "../lib/supabase/auth-cookie.ts";

const projectRoot = path.resolve(import.meta.dirname, "..");

test("detects stale refresh-token errors without treating retryable 502s as stale", () => {
  assert.equal(
    isInvalidRefreshTokenError({
      status: 400,
      code: "refresh_token_not_found",
      message: "Invalid Refresh Token: Refresh Token Not Found",
    }),
    true,
  );
  assert.equal(
    isInvalidRefreshTokenError({
      status: 400,
      message: "Invalid Refresh Token: Refresh Token Not Found",
    }),
    true,
  );
  assert.equal(
    isInvalidRefreshTokenError({ status: 502, name: "AuthRetryableFetchError" }),
    false,
  );
  assert.equal(isInvalidRefreshTokenError(null), false);
});

test("selects only Supabase auth and PKCE cookies for expiry", () => {
  assert.equal(isSupabaseAuthCookieName("sb-project-auth-token"), true);
  assert.equal(isSupabaseAuthCookieName("sb-project-auth-token.0"), true);
  assert.equal(
    isSupabaseAuthCookieName("sb-project-auth-token-code-verifier"),
    true,
  );
  assert.equal(isSupabaseAuthCookieName("locale"), false);
  assert.equal(isSupabaseAuthCookieName("session"), false);
});

test("browser, server, and middleware use one stable auth cookie name", async () => {
  assert.equal(SUPABASE_AUTH_COOKIE_NAME, "sb-virtual-run-auth-token");

  for (const relativePath of [
    "lib/supabase/client.ts",
    "lib/supabase/server.ts",
    "lib/supabase/middleware.ts",
  ]) {
    const source = await readFile(path.join(projectRoot, relativePath), "utf8");
    assert.match(source, /SUPABASE_AUTH_COOKIE_NAME/, relativePath);
    assert.match(
      source,
      /cookieOptions:\s*{\s*name:\s*SUPABASE_AUTH_COOKIE_NAME\s*}/,
      relativePath,
    );
  }
});

test("middleware clears a stale Supabase session and redirects to login", async () => {
  const source = await readFile(
    path.join(projectRoot, "lib/supabase/middleware.ts"),
    "utf8",
  );

  assert.match(source, /isInvalidRefreshTokenError\(authError\)/);
  assert.match(source, /isSupabaseAuthCookieName\(cookie\.name\)/);
  assert.match(source, /NextResponse\.redirect/);
  assert.match(source, /maxAge:\s*0/);
  assert.match(source, /Cache-Control",\s*"private, no-store"/);
});
