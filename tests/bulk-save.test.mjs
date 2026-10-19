import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BULK_COUNT_KEY,
  BULK_NONCE_KEY,
  bulkFieldName,
  bulkSuccessUrl,
  splitBulkFormData,
} from "../lib/bulk-form.ts";

const read = (path) => readFile(path, "utf8");

test("bulk form data splits back into one FormData per edited item", () => {
  const payload = new FormData();
  payload.set(BULK_COUNT_KEY, "2");
  payload.append(bulkFieldName(0, "id"), "a");
  payload.append(bulkFieldName(0, "activity_types"), "run");
  payload.append(bulkFieldName(0, "activity_types"), "walk");
  payload.append(bulkFieldName(1, "id"), "b");
  payload.append(bulkFieldName(1, "name"), "ชื่อ: มีโคลอน");
  payload.append(bulkFieldName(5, "id"), "out-of-range");
  payload.append("stray", "ignored");

  const items = splitBulkFormData(payload);
  assert.equal(items.length, 2);
  assert.equal(items[0].get("id"), "a");
  assert.deepEqual(items[0].getAll("activity_types"), ["run", "walk"]);
  assert.equal(items[1].get("id"), "b");
  assert.equal(items[1].get("name"), "ชื่อ: มีโคลอน");
});

test("bulk form data rejects missing or oversized counts", () => {
  for (const count of [null, "0", "-1", "abc", "201"]) {
    const payload = new FormData();
    if (count !== null) payload.set(BULK_COUNT_KEY, count);
    assert.deepEqual(splitBulkFormData(payload), []);
  }
});

test("bulk success url carries the saved count and a numeric nonce", () => {
  const payload = new FormData();
  payload.set(BULK_NONCE_KEY, "1760000000000<script>");
  assert.equal(
    bulkSuccessUrl("/admin/levels?saved=1", payload, 3),
    "/admin/levels?saved=1&bulk_saved=3&bulk=1760000000000",
  );
  assert.equal(bulkSuccessUrl("/admin/levels", new FormData(), 1), "/admin/levels?bulk_saved=1");
});

test("editable admin lists expose a save-all button wired to a bulk action", async () => {
  const pages = [
    ["app/admin/articles/page.tsx", "bulkUpdateContentCategories", "updateContentCategory"],
    ["app/admin/levels/page.tsx", "bulkUpdateLevels", "updateLevel"],
    ["app/admin/hero-banners/page.tsx", "bulkUpdateHeroBanners", "updateHeroBanner"],
    ["app/admin/storage/page.tsx", "bulkUpdateEventEvidenceRetention", "updateEventEvidenceRetention"],
    ["app/admin/events/[id]/page.tsx", "bulkUpdatePackages", "updatePackage"],
    ["app/admin/events/[id]/page.tsx", "bulkUpdateMedals", "updateMedal"],
    ["app/admin/events/[id]/page.tsx", "bulkUpdatePhysicalMedals", "updatePhysicalMedal"],
    ["components/admin/event-distance-levels-tab.tsx", "bulkUpdateEventDistanceLevels", "updateEventDistanceLevel"],
  ];

  for (const [path, bulkAction, itemAction] of pages) {
    const source = await read(path);
    assert.match(source, new RegExp(`<BulkSaveScope action=\\{${bulkAction}\\}>`), path);
    assert.match(
      source,
      new RegExp(`action=\\{${itemAction}\\}[^>]*data-bulk-item`),
      `${path} ${itemAction} form must opt in to save-all`,
    );
  }
});

test("bulk actions reuse the per-item save logic and keep their guards", async () => {
  const [admin, content, levels, retention, scope] = await Promise.all([
    read("lib/actions/admin.ts"),
    read("lib/actions/content.ts"),
    read("lib/actions/levels.ts"),
    read("lib/actions/evidence-retention.ts"),
    read("components/admin/bulk-save-scope.tsx"),
  ]);

  for (const [bulk, save] of [
    ["bulkUpdatePackages", "savePackage"],
    ["bulkUpdateMedals", "saveMedal"],
    ["bulkUpdatePhysicalMedals", "savePhysicalMedal"],
    ["bulkUpdateHeroBanners", "saveHeroBanner"],
    ["bulkUpdateEventDistanceLevels", "saveEventDistanceLevel"],
  ]) {
    const body = admin.slice(admin.indexOf(`export async function ${bulk}`));
    assert.match(body, /^export async function \w+\(formData: FormData\) \{\r?\n  await requireManager\(\);/, bulk);
    assert.match(body.slice(0, 900), new RegExp(`await ${save}\\(db, item\\)`), bulk);
  }
  // event-scoped bulk saves must not mix events
  assert.equal(admin.match(/items\.some\(\(item\) => item\.get\("event_id"\) !==/g)?.length, 4);

  assert.match(content, /export async function bulkUpdateContentCategories[\s\S]*?await requireManager\(\);[\s\S]*?saveContentCategory\(db, item\)/);
  assert.match(levels, /export async function bulkUpdateLevels[\s\S]*?await requireManager\(\);[\s\S]*?await validateLevelSequence\(candidates\);[\s\S]*?await saveLevels\(candidates\);/);
  assert.match(retention, /export async function bulkUpdateEventEvidenceRetention[\s\S]*?await requireSuperAdmin\(\);/);

  // only edited forms are sent, and per-item move/delete buttons do not count as saves
  assert.match(scope, /form\[data-bulk-item\]/);
  assert.match(scope, /event\.submitter\?\.hasAttribute\("formaction"\)/);
  assert.match(scope, /invalid\.reportValidity\(\)/);
});
