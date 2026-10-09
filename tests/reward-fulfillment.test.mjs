import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20261009034653_add_reward_fulfillment_options.sql';
const englishContactMigrationPath = 'supabase/migrations/20261009092445_add_pickup_location_english_contact.sql';

test('reward fulfillment migration keeps redemption atomic and restricted', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create table public\.reward_pickup_locations/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /check \(allows_pickup or allows_shipping\)/i);
  assert.match(sql, /pickup_location_snapshot jsonb/i);
  assert.match(sql, /shipping_address jsonb/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /revoke execute on function public\.redeem_reward\(uuid, text\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.redeem_reward\(uuid, text\) to authenticated/i);
});

test('pickup location migration stores English contact details in redemption snapshots', async () => {
  const sql = await readFile(englishContactMigrationPath, 'utf8');

  assert.match(sql, /add column contact_phone_en text/i);
  assert.match(sql, /contact_phone_en_length_check/i);
  assert.match(sql, /'contact_phone_en', v_location\.contact_phone_en/i);
  assert.match(sql, /revoke execute on function public\.redeem_reward\(uuid, text\) from public, anon/i);
});

test('reward redemption submits the selected fulfillment method', async () => {
  const [action, button] = await Promise.all([
    readFile('lib/actions/rewards.ts', 'utf8'),
    readFile('components/dashboard/reward-redeem-button.tsx', 'utf8'),
  ]);

  assert.match(action, /p_fulfillment_method: fulfillmentMethod/);
  assert.match(button, /name=['"]fulfillment_method['"]/);
  assert.match(button, /รับด้วยตนเอง/);
  assert.match(button, /จัดส่ง/);
});

test('pickup location admin supports modal forms, search, edit, and guarded delete', async () => {
  const [page, tab, modal, actions] = await Promise.all([
    readFile('app/admin/rewards/page.tsx', 'utf8'),
    readFile('components/admin/reward-pickup-locations-tab.tsx', 'utf8'),
    readFile('components/admin/reward-pickup-location-modal.tsx', 'utf8'),
    readFile('lib/actions/reward-locations.ts', 'utf8'),
  ]);

  assert.match(page, /location_q/);
  assert.match(tab, /CreateRewardPickupLocationModal/);
  assert.match(tab, /name='location_q'/);
  assert.match(tab, /EditRewardPickupLocationModal/);
  assert.match(tab, /deleteRewardPickupLocation/);
  assert.match(modal, /createPortal/);
  assert.match(modal, /name='contact_phone'/);
  assert.match(modal, /name='contact_phone_en'/);
  assert.match(tab, /location\.contact_phone_en/);
  assert.match(actions, /contact_phone_en: optional\(formData, 'contact_phone_en'\)/);
  assert.match(actions, /export async function deleteRewardPickupLocation/);
  assert.match(actions, /\.from\('rewards'\)[\s\S]*\.eq\('pickup_location_id', id\)/);
  assert.match(actions, /if \(location\.is_primary\)/);
});
