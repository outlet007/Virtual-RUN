import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { registrationStatusLabel, type ShippingAddress } from "@/lib/admin/registrations";
import { createUtf8BomCsv } from "@/lib/csv";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type EventRegistrationExportRow = {
  bib_number: string | null;
  shipping_address: ShippingAddress;
  status: string;
  registered_at: string;
  users: { name: string | null; email: string | null } | null;
  packages: { name: string } | null;
};

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
  await requireAdmin();

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
      "bib_number, shipping_address, status, registered_at, users(name, email), packages(name)",
    )
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (registrationStatus !== "all") query = query.eq("status", registrationStatus);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

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
    return [
      registration.users?.name ?? "",
      registration.users?.email ?? "",
      registration.packages?.name ?? "",
      registration.bib_number ?? "",
      registrationStatusLabel[registration.status] ?? registration.status,
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
