import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const adminList = fs.readFileSync("app/admin/events/page.tsx", "utf8");
const adminDetail = fs.readFileSync("app/admin/events/[id]/page.tsx", "utf8");
const adminActions = fs.readFileSync("lib/actions/admin.ts", "utf8");

test("Admin list filters and labels use effective event status", () => {
  assert.match(adminList, /getAdminEventStatusFilter\(statusFilter, today\)/);
  assert.match(adminList, /\.eq\("status", "open"\)\.gte\("end_date", effectiveStatusFilter\.today\)/);
  assert.match(
    adminList,
    /status\.eq\.closed,and\(status\.eq\.open,end_date\.lt\.\$\{effectiveStatusFilter\.today\}\)/,
  );
  assert.match(adminList, /statusClass\[effectiveStatus\]/);
});

test("Admin detail and edit modal receive effective event status", () => {
  assert.match(adminDetail, /getEffectiveEventStatus\(event\.status, event\.end_date, getBangkokDate\(\)\)/);
  assert.match(adminDetail, /status: effectiveStatus/);
});

test("create and update actions normalize expired open events before persistence", () => {
  const matches = adminActions.match(/status: getEffectiveEventStatus\(status, end_date\)/g) ?? [];
  assert.equal(matches.length, 2);
});
