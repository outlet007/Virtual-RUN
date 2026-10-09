'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireManager } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function locationError(
  message: string,
  options: { id?: string; create?: boolean } = {},
): never {
  const suffix = options.id
    ? `&edit_location=${encodeURIComponent(options.id)}`
    : options.create
      ? '&create_location=1'
      : '';
  redirect(`/admin/rewards?tab=locations&error=${encodeURIComponent(message)}${suffix}`);
}

function optional(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim() || null;
}

function fields(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    name_en: optional(formData, 'name_en'),
    address: String(formData.get('address') ?? '').trim(),
    address_en: optional(formData, 'address_en'),
    contact_phone: optional(formData, 'contact_phone'),
    contact_phone_en: optional(formData, 'contact_phone_en'),
    maps_url: optional(formData, 'maps_url'),
    instructions: optional(formData, 'instructions'),
    instructions_en: optional(formData, 'instructions_en'),
    is_active: formData.get('is_active') === 'on',
  };
}

function validateLocation(
  input: ReturnType<typeof fields>,
  options: { id?: string; create?: boolean } = {},
) {
  if (!input.name || !input.address) locationError('กรุณากรอกชื่อและที่อยู่สถานที่รับรางวัล', options);
  if (input.maps_url) {
    try {
      const url = new URL(input.maps_url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      locationError('ลิงก์แผนที่ต้องเป็น URL แบบ http หรือ https', options);
    }
  }
}

export async function createRewardPickupLocation(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const input = fields(formData);
  validateLocation(input, { create: true });

  const { data: primary } = await db
    .from('reward_pickup_locations')
    .select('id')
    .eq('is_primary', true)
    .maybeSingle();
  if (!primary && !input.is_active) {
    locationError('สถานที่แรกต้องเปิดใช้งานเพื่อใช้เป็นสถานที่หลัก', { create: true });
  }
  const { data, error } = await db
    .from('reward_pickup_locations')
    .insert({ ...input, is_primary: false })
    .select('id')
    .single();
  if (error) locationError(error.message, { create: true });

  if (!primary || formData.get('is_primary') === 'on') {
    const { error: primaryError } = await db.rpc('set_primary_reward_pickup_location', {
      p_location_id: data.id,
    });
    if (primaryError) locationError(primaryError.message, { create: true });
  }

  revalidatePath('/admin/rewards');
  redirect('/admin/rewards?tab=locations&location_added=1');
}

export async function updateRewardPickupLocation(formData: FormData) {
  await requireManager();
  const db = createAdminClient();
  const id = String(formData.get('id') ?? '');
  const input = fields(formData);
  if (!id) locationError('ไม่พบสถานที่รับรางวัล');
  validateLocation(input, { id });

  const { data: current, error: readError } = await db
    .from('reward_pickup_locations')
    .select('is_primary')
    .eq('id', id)
    .single();
  if (readError) locationError(readError.message, { id });
  if (current.is_primary && !input.is_active) {
    locationError('สถานที่หลักต้องเปิดใช้งาน กรุณาตั้งสถานที่อื่นเป็นหลักก่อน', { id });
  }
  if (!input.is_active) {
    const { count, error: countError } = await db
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('pickup_location_id', id)
      .eq('allows_pickup', true);
    if (countError) locationError(countError.message, { id });
    if ((count ?? 0) > 0) {
      locationError('สถานที่นี้ยังผูกกับรางวัลที่เปิดรับด้วยตนเอง กรุณาเปลี่ยนรางวัลก่อน', { id });
    }
  }

  const { error } = await db
    .from('reward_pickup_locations')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) locationError(error.message, { id });

  if (formData.get('is_primary') === 'on' && !current.is_primary) {
    const { error: primaryError } = await db.rpc('set_primary_reward_pickup_location', {
      p_location_id: id,
    });
    if (primaryError) locationError(primaryError.message, { id });
  }

  revalidatePath('/admin/rewards');
  revalidatePath('/dashboard/rewards');
  redirect('/admin/rewards?tab=locations&location_saved=1');
}

export async function setPrimaryRewardPickupLocation(formData: FormData) {
  await requireManager();
  const id = String(formData.get('id') ?? '');
  if (!id) locationError('ไม่พบสถานที่รับรางวัล');
  const db = createAdminClient();
  const { error } = await db.rpc('set_primary_reward_pickup_location', { p_location_id: id });
  if (error) locationError(error.message);
  revalidatePath('/admin/rewards');
  redirect('/admin/rewards?tab=locations&location_saved=1');
}

export async function deleteRewardPickupLocation(formData: FormData) {
  await requireManager();
  const id = String(formData.get('id') ?? '');
  if (!id) locationError('ไม่พบสถานที่รับรางวัล');

  const db = createAdminClient();
  const { data: location, error: readError } = await db
    .from('reward_pickup_locations')
    .select('is_primary')
    .eq('id', id)
    .single();
  if (readError) locationError(readError.message);
  if (location.is_primary) {
    locationError('ไม่สามารถลบสถานที่หลักได้ กรุณาตั้งสถานที่อื่นเป็นสถานที่หลักก่อน');
  }

  const { count, error: countError } = await db
    .from('rewards')
    .select('id', { count: 'exact', head: true })
    .eq('pickup_location_id', id);
  if (countError) locationError(countError.message);
  if ((count ?? 0) > 0) {
    locationError('ไม่สามารถลบสถานที่ที่ยังผูกกับรางวัลได้ กรุณาเปลี่ยนสถานที่ของรางวัลก่อน');
  }

  const { error } = await db.from('reward_pickup_locations').delete().eq('id', id);
  if (error) locationError(error.message);

  revalidatePath('/admin/rewards');
  revalidatePath('/dashboard/rewards');
  redirect('/admin/rewards?tab=locations&location_deleted=1');
}
