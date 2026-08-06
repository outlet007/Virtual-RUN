import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminRegistrations,
  registrationStatusLabel,
} from "@/lib/admin/registrations";
import { createUtf8BomCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const registrations = await getAdminRegistrations({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    eventId: request.nextUrl.searchParams.get("event") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
  });

  const rows = registrations.map((registration) => {
    const address = registration.shipping_address;
    return [
      registration.users?.name ?? "",
      registration.users?.email ?? "",
      registration.events?.title ?? "",
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
      "งาน",
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
      "Content-Disposition": `attachment; filename="virtual-run-registrations-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
