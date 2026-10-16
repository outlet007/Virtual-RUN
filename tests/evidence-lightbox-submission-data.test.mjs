import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("evidence modal shows the applicant-entered comparison values", async () => {
  const [lightbox, submissions] = await Promise.all([
    read("components/admin/evidence-lightbox.tsx"),
    read("components/admin/event-submissions-tab.tsx"),
  ]);

  assert.equal(lightbox.includes("distanceLabel: string"), true);
  assert.equal(lightbox.includes("durationLabel: string"), true);
  assert.equal(lightbox.includes("activityDateLabel: string"), true);
  assert.equal(lightbox.includes("ระยะทางที่กรอก"), true);
  assert.equal(lightbox.includes("เวลาที่กรอก"), true);
  assert.equal(lightbox.includes("วันที่ทำกิจกรรม"), true);
  assert.equal(lightbox.includes("{distanceLabel}"), true);
  assert.equal(lightbox.includes("{durationLabel}"), true);
  assert.equal(lightbox.includes("{activityDateLabel}"), true);

  assert.equal(submissions.includes("distanceLabel={formatKm(Number(s.distance_km))"), true);
  assert.equal(submissions.includes("formatDuration(s.duration_sec)"), true);
  assert.equal(submissions.includes("new Date(s.activity_date).toLocaleDateString"), true);
  assert.equal(submissions.includes('timeZone: "Asia/Bangkok"'), true);
});