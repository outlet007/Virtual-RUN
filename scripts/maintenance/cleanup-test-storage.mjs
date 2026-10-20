// ลบไฟล์ใน Supabase Storage ที่เหลือจากข้อมูลช่วงทดสอบ (รันหลัง cleanup-test-data.sql แบบ apply)
//
// ลบเฉพาะไฟล์ใน:
//   run-evidence  (ทั้ง bucket)                     — หลักฐานวิ่ง
//   event-images  covers/ posters/ medals/ physical-medals/ rewards/ description/
//   event-videos  description/
// และ "ไม่ลบไฟล์ที่ยังมีแถวใดในฐานข้อมูลอ้างถึง" (อ่านทุกตารางที่ REST เปิดให้ service role)
// ไม่แตะ: event-images/hero (Banner), event-images/mock-events, content-assets, system-assets, user-avatars
//
// ต้องรันในที่ที่มี SUPABASE_URL และ service key ฝั่ง server เช่นใน container ของเว็บ:
//   dry-run: docker exec -i Virtual-RUN node --input-type=module - < scripts/maintenance/cleanup-test-storage.mjs
//   ลบจริง:  docker exec -i -e APPLY=1 Virtual-RUN node --input-type=module - < scripts/maintenance/cleanup-test-storage.mjs
// ลบผ่าน Storage API เท่านั้น (ห้ามลบแถว storage.objects ด้วย SQL เพราะไฟล์จริงจะค้างบนดิสก์)

const baseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.env.APPLY === "1";

if (!baseUrl || !key) {
  console.error("ไม่พบ SUPABASE_URL หรือ service key ใน environment");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };

const TARGETS = [
  { bucket: "run-evidence", prefixes: [""] },
  {
    bucket: "event-images",
    prefixes: ["covers", "posters", "medals", "physical-medals", "rewards", "description"],
  },
  { bucket: "event-videos", prefixes: ["description"] },
];

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${response.status} ${await response.text()}`);
  }
  return response;
}

// รายการไฟล์ทั้งหมดใต้ prefix (folder ใน Storage list มี id = null จึงต้องไล่ลงไป)
async function listObjects(bucket, prefix) {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await request(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const items = await response.json();
    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listObjects(bucket, path)));
      else files.push({ path, size: Number(item.metadata?.size ?? 0) });
    }
    if (items.length < 1000) return files;
  }
}

// ข้อความรวมของทุกแถวในทุกตารางที่ REST เปิดให้ service role — ใช้ตรวจว่าไฟล์ยังถูกอ้างถึงไหม
// อ่านตารางใดไม่ได้ให้หยุดทันที เพื่อไม่ลบไฟล์ที่อาจยังถูกอ้างถึง
async function referencedText() {
  const spec = await (await request("/rest/v1/", { headers: { accept: "application/openapi+json" } })).json();
  const tables = Object.keys(spec.paths ?? {})
    .filter((path) => path !== "/" && !path.startsWith("/rpc/"))
    .map((path) => path.slice(1));
  const chunks = [];
  for (const table of tables) {
    for (let from = 0; ; from += 1000) {
      const response = await request(`/rest/v1/${table}?select=*`, {
        headers: { "Range-Unit": "items", Range: `${from}-${from + 999}` },
      });
      const rows = await response.json();
      chunks.push(JSON.stringify(rows));
      if (rows.length < 1000) break;
    }
  }
  return { text: chunks.join("\n"), tables: tables.length };
}

const { text: references, tables } = await referencedText();
console.log(`ตรวจการอ้างอิงจาก ${tables} ตาราง/view`);

let totalDelete = 0;
let totalBytes = 0;
for (const { bucket, prefixes } of TARGETS) {
  const files = [];
  for (const prefix of prefixes) files.push(...(await listObjects(bucket, prefix)));
  const kept = files.filter((file) => references.includes(file.path));
  const toDelete = files.filter((file) => !references.includes(file.path));
  const bytes = toDelete.reduce((sum, file) => sum + file.size, 0);
  totalDelete += toDelete.length;
  totalBytes += bytes;
  console.log(
    `${bucket}: พบ ${files.length} ไฟล์, ยังถูกอ้างถึง (เก็บ) ${kept.length}, จะลบ ${toDelete.length} (${(bytes / 1024 / 1024).toFixed(2)} MB)`,
  );
  for (const file of kept) console.log(`  เก็บ: ${file.path}`);

  if (apply) {
    for (let i = 0; i < toDelete.length; i += 500) {
      const batch = toDelete.slice(i, i + 500).map((file) => file.path);
      await request(`/storage/v1/object/${bucket}`, { method: "DELETE", body: JSON.stringify({ prefixes: batch }) });
    }
  }
}

console.log(
  apply
    ? `APPLIED: ลบแล้ว ${totalDelete} ไฟล์ (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`
    : `DRY-RUN: จะลบ ${totalDelete} ไฟล์ (${(totalBytes / 1024 / 1024).toFixed(2)} MB) — รันซ้ำด้วย -e APPLY=1 เพื่อลบจริง`,
);
