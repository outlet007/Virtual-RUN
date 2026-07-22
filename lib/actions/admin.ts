"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { genBib } from "@/lib/utils";

function err(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ---------- Events ----------

export async function createEvent(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cover_image = String(formData.get("cover_image") ?? "").trim();
  const pricing = String(formData.get("pricing") ?? "free");
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  const status = String(formData.get("status") ?? "draft");

  if (!title || !start_date || !end_date) {
    err("/admin/events/new", "กรอกชื่องานและวันที่ให้ครบ");
  }

  const { data, error } = await db
    .from("events")
    .insert({
      title,
      description: description || null,
      cover_image: cover_image || null,
      pricing,
      start_date,
      end_date,
      status,
    })
    .select("id")
    .single();

  if (error) err("/admin/events/new", error.message);

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect(`/admin/events/${data!.id}?created=1`);
}

export async function updateEvent(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cover_image = String(formData.get("cover_image") ?? "").trim();
  const pricing = String(formData.get("pricing") ?? "free");
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  const status = String(formData.get("status") ?? "draft");

  if (!id || !title || !start_date || !end_date) {
    err(`/admin/events/${id}`, "กรอกชื่องานและวันที่ให้ครบ");
  }

  const { error } = await db
    .from("events")
    .update({
      title,
      description: description || null,
      cover_image: cover_image || null,
      pricing,
      start_date,
      end_date,
      status,
    })
    .eq("id", id);

  if (error) err(`/admin/events/${id}`, error.message);

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/");
  redirect(`/admin/events/${id}?saved=1`);
}

// ---------- Packages ----------

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const event_id = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target_distance_km = Number(formData.get("target_distance_km") ?? 0);
  const price = Number(formData.get("price") ?? 0);
  const activity_types = formData.getAll("activity_types").map(String);
  const has_physical_medal = formData.get("has_physical_medal") === "on";

  if (!event_id || !name || target_distance_km <= 0) {
    err(`/admin/events/${event_id}`, "กรอกชื่อแพ็กเกจและระยะเป้าหมายให้ถูกต้อง");
  }

  const { error } = await db.from("packages").insert({
    event_id,
    name,
    target_distance_km,
    price,
    activity_types: activity_types.length > 0 ? activity_types : ["run", "walk"],
    has_physical_medal,
  });

  if (error) err(`/admin/events/${event_id}`, error.message);

  revalidatePath(`/admin/events/${event_id}`);
  revalidatePath("/");
  redirect(`/admin/events/${event_id}?package_added=1`);
}

export async function updatePackage(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const event_id = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target_distance_km = Number(formData.get("target_distance_km") ?? 0);
  const price = Number(formData.get("price") ?? 0);
  const activity_types = formData.getAll("activity_types").map(String);
  const has_physical_medal = formData.get("has_physical_medal") === "on";

  if (!id || !event_id || !name || target_distance_km <= 0) {
    err(`/admin/events/${event_id}`, "กรอกชื่อแพ็กเกจและระยะเป้าหมายให้ถูกต้อง");
  }

  const { error } = await db
    .from("packages")
    .update({
      name,
      target_distance_km,
      price,
      activity_types: activity_types.length > 0 ? activity_types : ["run", "walk"],
      has_physical_medal,
    })
    .eq("id", id);

  if (error) err(`/admin/events/${event_id}`, error.message);

  revalidatePath(`/admin/events/${event_id}`);
  revalidatePath("/");
  redirect(`/admin/events/${event_id}?package_saved=1`);
}

// ---------- Submissions ----------

export async function reviewSubmission(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const status = decision === "approve" ? "approved" : "rejected";

  if (!id || (decision !== "approve" && decision !== "reject")) {
    err("/admin/submissions", "คำขอไม่ถูกต้อง");
  }

  const { error } = await db.from("submissions").update({ status }).eq("id", id);
  if (error) err("/admin/submissions", error.message);

  revalidatePath("/admin/submissions");
  revalidatePath("/dashboard");
  redirect(`/admin/submissions?reviewed=${status}`);
}

// ---------- Shipments ----------

export async function upsertShipment(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const registration_id = String(formData.get("registration_id") ?? "");
  const carrier = String(formData.get("carrier") ?? "").trim();
  const tracking_no = String(formData.get("tracking_no") ?? "").trim();
  const status = String(formData.get("status") ?? "pending");

  if (!registration_id) err("/admin/shipments", "ไม่พบใบสมัคร");

  const { error } = await db.from("shipments").upsert(
    {
      registration_id,
      carrier: carrier || null,
      tracking_no: tracking_no || null,
      status,
      shipped_at: status === "shipped" || status === "delivered" ? new Date().toISOString() : null,
    },
    { onConflict: "registration_id" },
  );

  if (error) err("/admin/shipments", error.message);

  revalidatePath("/admin/shipments");
  redirect("/admin/shipments?saved=1");
}

// ---------- Admins ----------

export async function promoteAdmin(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) err("/admin/admins", "กรอกอีเมล");

  const { data: target } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!target) {
    err("/admin/admins", "ไม่พบผู้ใช้อีเมลนี้ — ต้องให้เขาสมัครสมาชิกก่อน");
  }

  const { error } = await db.from("users").update({ role: "admin" }).eq("id", target!.id);
  if (error) err("/admin/admins", error.message);

  revalidatePath("/admin/admins");
  redirect("/admin/admins?promoted=1");
}

export async function demoteAdmin(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id") ?? "");
  if (!id) err("/admin/admins", "ไม่พบผู้ใช้");

  const { count } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) <= 1) {
    err("/admin/admins", "ต้องมีผู้ดูแลระบบเหลืออย่างน้อย 1 คน");
  }

  const { error } = await db.from("users").update({ role: "user" }).eq("id", id);
  if (error) err("/admin/admins", error.message);

  revalidatePath("/admin/admins");
  redirect("/admin/admins?demoted=1");
}

// ---------- Payments ----------

export async function confirmPayment(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const paymentId = String(formData.get("payment_id") ?? "");
  const registrationId = String(formData.get("registration_id") ?? "");
  if (!paymentId || !registrationId) err("/admin/payments", "ไม่พบรายการชำระเงิน");

  const { error: payError } = await db
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (payError) err("/admin/payments", payError.message);

  const { error: regError } = await db
    .from("registrations")
    .update({ status: "confirmed", bib_number: genBib() })
    .eq("id", registrationId);
  if (regError) err("/admin/payments", regError.message);

  revalidatePath("/admin/payments");
  redirect("/admin/payments?confirmed=1");
}

export async function rejectPayment(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const paymentId = String(formData.get("payment_id") ?? "");
  const registrationId = String(formData.get("registration_id") ?? "");
  if (!paymentId || !registrationId) err("/admin/payments", "ไม่พบรายการชำระเงิน");

  const { error: payError } = await db
    .from("payments")
    .update({ status: "failed" })
    .eq("id", paymentId);
  if (payError) err("/admin/payments", payError.message);

  const { error: regError } = await db
    .from("registrations")
    .update({ status: "cancelled" })
    .eq("id", registrationId);
  if (regError) err("/admin/payments", regError.message);

  revalidatePath("/admin/payments");
  redirect("/admin/payments?rejected=1");
}
