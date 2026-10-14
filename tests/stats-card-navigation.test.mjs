import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('personal stats cards link to their related dashboard sections', async () => {
  const page = await readFile('app/(dashboard)/dashboard/stats/page.tsx', 'utf8');

  assert.match(page, /"ระยะสะสมรวม"[\s\S]*href: "\/dashboard\/history"/);
  assert.match(page, /"คะแนนสะสมรวม"[\s\S]*href: "\/dashboard\/rewards"/);
  assert.match(page, /"เหรียญที่ได้รับ"[\s\S]*href: "\/dashboard\/medals"/);
  assert.match(page, /"งานที่สมัคร"[\s\S]*href: "\/dashboard\/events"/);
  assert.match(page, /href=\{s\.href\}/);
  assert.match(page, /focus-visible:ring-2/);
});
