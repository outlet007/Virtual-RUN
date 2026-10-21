import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("admin keeps the original type scale while the public site uses the larger one", async () => {
  const [css, layout, tailwind] = await Promise.all([
    read("app/globals.css"),
    read("app/admin/layout.tsx"),
    read("tailwind.config.ts"),
  ]);
  assert.match(css, /\.admin-type-scale \.text-xs \{\s*font-size: 0\.75rem;\s*line-height: 1rem;/);
  assert.match(css, /\.admin-type-scale \.text-sm \{\s*font-size: 0\.875rem;\s*line-height: 1\.25rem;/);
  assert.match(css, /\.admin-type-scale \.prose-sm \{\s*font-size: 0\.875rem;/);
  assert.match(layout, /<div className="admin-type-scale space-y-6">/);
  // หน้าเว็บยังใช้ขนาดใหม่
  assert.match(tailwind, /xs: \["14px"/);
  assert.match(tailwind, /sm: \["15px"/);
});

test("every admin modal rendered through a portal carries the admin type scale", async () => {
  const files = (await readdir("components/admin")).filter((name) => name.endsWith(".tsx"));
  for (const name of files) {
    const source = await read(`components/admin/${name}`);
    if (!source.includes("createPortal(")) continue;
    assert.match(source, /className=["']admin-type-scale fixed inset-0/, `${name} portal root needs admin-type-scale`);
  }
});

test("admin pages avoid responsive text sizes that the scoped rule would override", async () => {
  const roots = ["app/admin", "components/admin"];
  const offenders = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (/\.tsx?$/.test(entry.name) && /\b(sm|md|lg|xl):text-(xs|sm|base|lg|xl)\b/.test(await read(path))) {
        offenders.push(path);
      }
    }
  }
  for (const root of roots) await walk(root);
  assert.deepEqual(offenders, []);
});
