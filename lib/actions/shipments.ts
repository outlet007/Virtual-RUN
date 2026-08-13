"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import {
  SHIPMENT_STATUSES,
  canTransitionShipmentStatus,
  isShipmentEligible,
  type ShipmentStatus,
} from "@/lib/admin/day8";
import { notifyUser } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

type Relation<T> = T | T[] | null;

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function shipmentReturnUrl(formData: FormData, values: Record<string, string>) {
  const params = new URLSearchParams();
  const q = String(formData.get("return_q") ?? "").trim();
  const status = String(formData.get("return_status") ?? "pending").trim();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  Object.entries(values).forEach(([key, value]) => params.set(key, value));
  return `/admin/shipments?${params.toString()}`;
}

function shipmentError(formData: FormData, message: string): never {
  redirect(shipmentReturnUrl(formData, { error: message }));
}

export async function updateShipmentStatus(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const registrationId = String(formData.get("registration_id") ?? "");
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNo = String(formData.get("tracking_no") ?? "").trim();
  const status = String(formData.get("status") ?? "pending") as ShipmentStatus;

  if (!registrationId) shipmentError(formData, "ไม่พบผู้สมัคร");
  if (!SHIPMENT_STATUSES.includes(status)) shipmentError(formData, "สถานะการจัดส่งไม่ถูกต้อง");
  if ((status === "shipped" || status === "delivered") && (!carrier || !trackingNo)) {
    shipmentError(formData, "กรุณากรอกผู้ให้บริการขนส่งและเลขพัสดุก่อนเปลี่ยนสถานะเป็นจัดส่งแล้ว");
  }

  const { data, error: registrationError } = await db
    .from("registrations")
    .select(
      "id, user_id, status, packages!inner(has_physical_medal, target_distance_km), submissions(distance_km, status), shipments(status, shipped_at)",
    )
    .eq("id", registrationId)
    .single();
  if (registrationError || !data) shipmentError(formData, registrationError?.message ?? "ไม่พบผู้สมัคร");

  const registration = data as unknown as {
    user_id: string;
    status: string;
    packages: Relation<{ has_physical_medal: boolean; target_distance_km: number }>;
    submissions: Array<{ distance_km: number | string; status: string }> | null;
    shipments: Relation<{ status: string; shipped_at: string | null }>;
  };
  const packageRow = firstRelation(registration.packages);
  const currentShipment = firstRelation(registration.shipments);
  const currentStatus = SHIPMENT_STATUSES.includes(currentShipment?.status as ShipmentStatus)
    ? (currentShipment?.status as ShipmentStatus)
    : "pending";
  const approvedDistanceKm = (registration.submissions ?? [])
    .filter((submission) => submission.status === "approved")
    .reduce((sum, submission) => sum + Number(submission.distance_km), 0);

  if (
    registration.status !== "confirmed" ||
    !packageRow?.has_physical_medal ||
    !isShipmentEligible({
      id: registrationId,
      approvedDistanceKm,
      targetDistanceKm: Number(packageRow?.target_distance_km ?? 0),
      shipmentStatus: currentStatus,
    })
  ) {
    shipmentError(formData, "ผู้สมัครรายนี้ยังไม่ครบเงื่อนไขสำหรับการจัดส่งเหรียญ");
  }
  if (!canTransitionShipmentStatus(currentStatus, status)) {
    shipmentError(formData, "ไม่สามารถย้อนสถานะการจัดส่งกลับไปขั้นก่อนหน้าได้");
  }

  const hasReachedShipped = status === "shipped" || status === "delivered";
  const shippedAt = hasReachedShipped
    ? currentShipment?.shipped_at ?? new Date().toISOString()
    : null;
  const { error } = await db.from("shipments").upsert(
    {
      registration_id: registrationId,
      carrier: carrier || null,
      tracking_no: trackingNo || null,
      status,
      shipped_at: shippedAt,
    },
    { onConflict: "registration_id" },
  );
  if (error) shipmentError(formData, error.message);

  const newlyShipped =
    hasReachedShipped && currentStatus !== "shipped" && currentStatus !== "delivered";
  if (newlyShipped) {
    await notifyUser(registration.user_id, "shipment_shipped", {
      dedupeKey: `shipment:${registrationId}:shipped`,
      subject: "เหรียญของคุณถูกจัดส่งแล้ว",
      text: `เหรียญของคุณถูกจัดส่งแล้วผ่าน ${carrier} เลขพัสดุ ${trackingNo}`,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/shipments");
  redirect(shipmentReturnUrl(formData, { saved: "1" }));
}
