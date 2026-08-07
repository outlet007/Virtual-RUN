import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminShipments,
  normalizeShipmentStatusFilter,
  shipmentStatusLabel,
} from "@/lib/admin/shipments";
import { createUtf8BomCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const shipments = await getAdminShipments({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    status: normalizeShipmentStatusFilter(
      request.nextUrl.searchParams.get("status") ?? undefined,
    ),
  });

  const rows = shipments.map((registration) => {
    const address = registration.shippingAddress;
    return [
      registration.user?.name ?? "",
      registration.user?.email ?? "",
      registration.eventTitle,
      registration.packageName,
      registration.bibNumber ?? "",
      registration.approvedDistanceKm,
      registration.targetDistanceKm,
      address?.recipient ?? "",
      address?.phone ?? "",
      address?.address ?? "",
      address?.province ?? "",
      address?.postal_code ?? "",
      registration.shipment.carrier ?? "",
      registration.shipment.trackingNo ?? "",
      shipmentStatusLabel[registration.shipment.status],
      registration.shipment.shippedAt
        ? new Date(registration.shipment.shippedAt).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
          })
        : "",
    ];
  });

  const csv = createUtf8BomCsv([
    [
      "ชื่อผู้สมัคร",
      "อีเมล",
      "งาน",
      "แพ็กเกจ",
      "BIB",
      "ระยะสะสม (กม.)",
      "ระยะเป้าหมาย (กม.)",
      "ชื่อผู้รับ",
      "โทรศัพท์",
      "ที่อยู่",
      "จังหวัด",
      "รหัสไปรษณีย์",
      "ผู้ให้บริการขนส่ง",
      "เลขพัสดุ",
      "สถานะ",
      "วันที่จัดส่ง",
    ],
    ...rows,
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="virtual-run-shipments-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
