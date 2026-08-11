import assert from "node:assert/strict";
import test from "node:test";
import {
  getHeroSignupHref,
  shouldShowDefaultHeroActions,
} from "../lib/hero-banner.ts";

test("default hero buttons are hidden when the banner has its own link", () => {
  assert.equal(shouldShowDefaultHeroActions("/events/example"), false);
  assert.equal(shouldShowDefaultHeroActions("https://example.com"), false);
});

test("default hero buttons remain when the banner has no link", () => {
  assert.equal(shouldShowDefaultHeroActions(null), true);
  assert.equal(shouldShowDefaultHeroActions("   "), true);
});

test("signed-in users are sent to their dashboard from the hero sign-up button", () => {
  assert.equal(getHeroSignupHref(true), "/dashboard");
  assert.equal(getHeroSignupHref(false), "/signup");
});