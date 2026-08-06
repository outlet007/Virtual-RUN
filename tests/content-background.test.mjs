import assert from "node:assert/strict";
import test from "node:test";
import {
  getContentBackgroundDisplayStyle,
  getContentBackgroundInsetStyle,
} from "../lib/content-background.ts";

const expectedStyles = {
  cover: { backgroundSize: "cover", backgroundRepeat: "no-repeat" },
  contain: { backgroundSize: "contain", backgroundRepeat: "no-repeat" },
  stretch: { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" },
  auto: { backgroundSize: "auto", backgroundRepeat: "no-repeat" },
  repeat: { backgroundSize: "auto", backgroundRepeat: "repeat" },
  "repeat-x": { backgroundSize: "auto", backgroundRepeat: "repeat-x" },
  "repeat-y": { backgroundSize: "auto", backgroundRepeat: "repeat-y" },
};

for (const [mode, expected] of Object.entries(expectedStyles)) {
  test(`maps ${mode} to the expected CSS background properties`, () => {
    assert.deepEqual(getContentBackgroundDisplayStyle(mode), expected);
  });
}

test("maps top and bottom content background insets to pixel offsets", () => {
  assert.deepEqual(getContentBackgroundInsetStyle(24, 48), {
    top: "24px",
    bottom: "48px",
  });
});
