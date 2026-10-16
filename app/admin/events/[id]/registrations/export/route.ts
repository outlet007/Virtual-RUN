import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/admin";
import { registrationStatusLabel, type ShippingAddress } from "@/lib/admin/registrations";
import { createUtf8BomCsv } from "@/lib/csv";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getEventDistanceLevelProgress,
  sortEventDistanceLevels,
  type EventDistanceLevel,
} from "@/lib/event-distance-levels";
import {
  getRegistrationRunProgress,
  registrationRunStatusLabel,
} from "@/lib/registration-progress";

export const dynamic = "force-dynamic";

type EventRegistrationExportRow = {
  id: string;
  bib_number: string | null;
  shipping_address: ShippingAddress;
  status: string;
  registered_at: string;
  users: { name: string | null; email: string | null } | null;
  packages: { name: string; target_distance_km: number } | null;
};

function formatKm(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireManager();

  const { id } = await params;
  const registrationQuery = request.nextUrl.searchParams.get("registration_q")?.trim() ?? "";
  const requestedStatus = request.nextUrl.searchParams.get("registration_status") ?? "";
  const registrationStatus = ["pending", "confirmed", "cancelled"].includes(requestedStatus)
    ? requestedStatus
    : "all";

  const db = createAdminClient();
  let query = db
    .from("registrations")
    .select(
      "id, bib_number, shipping_address, status, registered_at, users(name, email), packages(name, target_distance_km)",
    )
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (registrationStatus !== "all") query = query.eq("status", registrationStatus);

  const [{ data, error }, { data: event, error: eventError }, { data: approvedSubs, error: subsError }] =
    await Promise.all([
      query,
      db
        .from("events")
        .select("event_mode, event_distance_levels(id, name, name_en, target_distance_km, sort_order)")
        .eq("id", id)
        .maybeSingle(),
      db
        .from("submissions")
        .select("registration_id, distance_km, registrations!inner(event_id)")
        .eq("registrations.event_id", id)
        .eq("status", "approved"),
    ]);
  if (error) throw new Error(error.message);
  if (eventError) throw new Error(eventError.message);
  if (subsError) throw new Error(subsError.message);

  // คำนวณสถานะการวิ่งแบบเดียวกับตารางผู้สมัครในหน้า Admin
  const isDistanceLevels = event?.event_mode === "distance_levels";
  const distanceLevels = sortEventDistanceLevels(
    (event?.event_distance_levels ?? []) as EventDistanceLevel[],
  );
  const approvedDistanceByRegistration = new Map<string, number>();
  for (const submission of approvedSubs ?? []) {
    approvedDistanceByRegistration.set(
      submission.registration_id,
      (approvedDistanceByRegistration.get(submission.registration_id) ?? 0) +
        Number(submission.distance_km),
    );
  }

  const searchNeedle = normalizeSearchValue(registrationQuery);
  const registrations = ((data ?? []) as unknown as EventRegistrationExportRow[]).filter(
    (registration) => {
      if (!searchNeedle) return true;
      const address = registration.shipping_address;
      return [
        registration.users?.name,
        registration.users?.email,
        registration.bib_number,
        registration.packages?.name,
        address?.recipient,
        address?.phone,
        address?.address,
        address?.province,
        address?.postal_code,
      ].some((value) => normalizeSearchValue(value).includes(searchNeedle));
    },
  );

  const rows = registrations.map((registration) => {
    const address = registration.shipping_address;
    const approvedDistanceKm = approvedDistanceByRegistration.get(registration.id) ?? 0;
    const levelProgress = getEventDistanceLevelProgress(distanceLevels, approvedDistanceKm);
    const runProgress = getRegistrationRunProgress({
      registrationStatus: registration.status,
      approvedDistanceKm,
      targetDistanceKm: isDistanceLevels
        ? levelProgress.finalLevel?.target_distance_km ?? 0
        : registration.packages?.target_distance_km ?? 0,
    });
    const levelDetail = !isDistanceLevels
      ? ""
      : levelProgress.completed
        ? "ผ่านครบทุกระดับแล้ว"
        : levelProgress.nextLevel
          ? `เหลือ ${formatKm(levelProgress.remainingDistanceKm)} กม. ถึง ${levelProgress.nextLevel.name}`
          : "";
    return [
      registration.users?.name ?? "",
      registration.users?.email ?? "",
      registration.packages?.name ?? "",
      registration.bib_number ?? "",
      registrationStatusLabel[registration.status] ?? registration.status,
      registrationRunStatusLabel[runProgress.status],
      formatKm(runProgress.approvedDistanceKm),
      formatKm(runProgress.targetDistanceKm),
      ...(isDistanceLevels
        ? [levelProgress.currentLevel?.name ?? "ยังไม่ผ่านระดับแรก", levelDetail]
        : []),
      registration.status === "pending" ? "รอยืนยันและออก BIB" : "ไม่มีรายการ",
      new Date(registration.registered_at).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      }),
      address?.recipient ?? "",
      address?.phone ?? "",
      address?.address ?? "",
      address?.province ?? "",
      address?.postal_code ?? "",
    ];
  });

  const csv = createUtf8BomCsv([
    [
      "ชื่อผู้สมัคร",
      "อีเมล",
      "แพ็กเกจ",
      "BIB",
      "สถานะ",
      "สถานะการวิ่ง",
      "ระยะที่อนุมัติ (กม.)",
      "ระยะเป้าหมาย (กม.)",
      ...(isDistanceLevels ? ["ระดับปัจจุบัน", "ความคืบหน้าระดับ"] : []),
      "การจัดการ",
      "วันที่สมัคร",
      "ชื่อผู้รับ",
      "โทรศัพท์",
      "ที่อยู่",
      "จังหวัด",
      "รหัสไปรษณีย์",
    ],
    ...rows,
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="virtual-run-event-registrations-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
