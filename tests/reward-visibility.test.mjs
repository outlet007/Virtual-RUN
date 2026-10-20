import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("migration adds reward visibility and blocks redeeming hidden rewards", async () => {
  const sql = await read("supabase/migrations/20261020042250_add_reward_visibility.sql");
  assert.match(sql, /add column is_active boolean not null default true/);
  assert.match(sql, /if not v_reward\.is_active then raise exception 'reward_not_available'; end if;/);
  assert.match(sql, /revoke execute on function public\.redeem_reward\(uuid, text\) from public, anon;/);
  assert.match(sql, /grant execute on function public\.redeem_reward\(uuid, text\) to authenticated;/);
  // read access stays open so redemption history keeps showing hidden reward names
  assert.doesNotMatch(sql, /policy/i);
});

test("admin catalog toggles visibility with an eye button and member catalogs hide hidden rewards", async () => {
  const [admin, actions, publicCatalog, dashboardCatalog, redeem] = await Promise.all([
    read("app/admin/rewards/page.tsx"),
    read("lib/actions/admin.ts"),
    read("app/rewards/page.tsx"),
    read("app/(dashboard)/dashboard/rewards/page.tsx"),
    read("lib/actions/rewards.ts"),
  ]);

  assert.match(admin, /<form action=\{setRewardVisibility\}>/);
  assert.match(admin, /name="visible" value=\{rw\.is_active \? "0" : "1"\}/);
  assert.match(admin, /<Eye className="size-4" aria-hidden="true" \/>/);
  assert.match(admin, /<EyeOff className="size-4 text-ink\/45" aria-hidden="true" \/>/);
  assert.match(admin, /aria-label=\{rw\.is_active \? `ซ่อนรางวัล/);
  assert.match(admin, /ซ่อนอยู่/);

  const action = actions.slice(actions.indexOf("export async function setRewardVisibility"));
  assert.match(action, /^export async function setRewardVisibility\(formData: FormData\) \{\r?\n  await requireManager\(\);/);
  assert.match(action.slice(0, 700), /update\(\{ is_active: visible \}\)/);

  for (const source of [publicCatalog, dashboardCatalog]) {
    assert.match(source, /\.from\("rewards"\)[\s\S]{0,400}\.eq\("is_active", true\)/);
  }
  assert.match(redeem, /reward_not_available:/);
});

test("admin redemption list has search and a status filter", async () => {
  const admin = await read("app/admin/rewards/page.tsx");
  assert.match(admin, /<input type="hidden" name="tab" value="redemptions" \/>/);
  assert.match(admin, /name="redemption_q"/);
  assert.match(admin, /<Select id="redemption-status" name="redemption_status" defaultValue=\{redemptionStatus\}>/);
  assert.match(admin, /sp\.redemption_status === "pending" \|\| sp\.redemption_status === "fulfilled"/);
  assert.match(admin, /\{filteredRedemptions\.map\(\(r\) => \(/);
  assert.match(admin, /ไม่พบรายการแลกรางวัลที่ตรงกับเงื่อนไข/);
  // ป้าย "ส่งมอบแล้ว" ใช้สีเขียวแบบเดียวกับป้าย "เปิดใช้งาน" ของสถานที่รับรางวัล
  assert.match(admin, /<Badge className="bg-emerald-50 text-emerald-700">ส่งมอบแล้ว \{fulfilledRedemptions\.length\}<\/Badge>/);
  assert.match(admin, /r\.status === "pending" \? "bg-medal-soft text-medal" : "bg-emerald-50 text-emerald-700"/);
});

test("fulfilled redemptions can be reverted to pending and re-notified on the next fulfil", async () => {
  const [admin, actions, confirm] = await Promise.all([
    read("app/admin/rewards/page.tsx"),
    read("lib/actions/admin.ts"),
    read("components/ui/confirm-delete-button.tsx"),
  ]);

  const revert = actions.slice(actions.indexOf("export async function revertRedemptionFulfillment"));
  assert.match(revert, /^export async function revertRedemptionFulfillment\(formData: FormData\) \{\r?\n  await requireManager\(\);/);
  assert.match(revert.slice(0, 700), /update\(\{ status: "pending", fulfilled_at: null \}\)[\s\S]*?\.eq\("status", "fulfilled"\)/);
  assert.doesNotMatch(revert.slice(0, 900), /from\("points_ledger"\)|\.update\(\{[^}]*stock/);
  // ส่งข้อความแจ้งว่าแจ้งผิดเฉพาะเมื่อแจ้งเตือน "ส่งมอบแล้ว" ถูกส่งถึงผู้ใช้จริง
  const revertBody = revert.slice(0, revert.indexOf("\nexport async function", 10));
  assert.match(revertBody, /\.eq\("type", "redemption_fulfilled"\)[\s\S]*?\.eq\("status", "sent"\)/);
  assert.match(revertBody, /notifyUser\(redemption\.user_id, "redemption_fulfillment_reverted"/);
  assert.match(revertBody, /dedupeKey: `redemption:\$\{id\}:reverted:\$\{revertedAt\}`/);
  assert.match(revertBody, /ส่งถึงคุณโดยผิดพลาด/);
  // ยืนยันใหม่หลังย้อนต้องแจ้งเตือนได้อีก (dedupe ผูกกับเวลายืนยัน)
  assert.match(actions, /dedupeKey: `redemption:\$\{id\}:fulfilled:\$\{fulfilledAt\}`/);

  assert.match(admin, /<form action=\{revertRedemptionFulfillment\}>/);
  assert.match(admin, /triggerLabel="ย้อนเป็นรอดำเนินการ"/);
  assert.match(admin, /icon="undo"/);
  assert.match(confirm, /icon = "delete"/);
  // ยืนยันส่งมอบต้องผ่านหน้าต่างยืนยัน (โทนเขียว) ก่อนเสมอ
  assert.match(admin, /<ConfirmDeleteButton\s+formAction=\{fulfillRedemption\}\s+tone="confirm"/);
  assert.doesNotMatch(admin, /<Button type="submit" icon="success">/);
  assert.match(confirm, /tone = "danger"/);
  assert.match(confirm, /bg-emerald-600 text-white hover:bg-emerald-700/);
});
