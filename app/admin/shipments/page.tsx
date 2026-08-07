import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { Card, Badge, Button, Input, Label, LinkButton, Select } from "@/components/ui";
import { updateShipmentStatus } from "@/lib/actions/shipments";
import {
  getAdminShipments,
  normalizeShipmentStatusFilter,
  shipmentStatusLabel,
} from "@/lib/admin/shipments";
import type { ShipmentStatusFilter } from "@/lib/admin/day8";

export const dynamic = "force-dynamic";

const statusClass = {
  pending: "bg-lane text-muted",
  packed: "bg-medal-soft text-medal",
  shipped: "bg-primary-soft text-primary-dark",
  delivered: "bg-primary text-ink",
};

const statusFilters: Array<{ value: ShipmentStatusFilter; label: string }> = [
  { value: "pending", label: "รอจัดส่ง" },
  { value: "shipped", label: "จัดส่งแล้ว" },
  { value: "delivered", label: "ถึงแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

function buildUrl(base: string, values: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export default async function AdminShipmentsPage({ searchParams }: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string; status?: string }>;
}) {
  const { saved, error, q: rawQuery, status: rawStatus } = await searchParams;
  const q = (rawQuery ?? "").trim();
  const status = normalizeShipmentStatusFilter(rawStatus);
  const regs = await getAdminShipments({ q, status });
  const exportHref = buildUrl("/admin/shipments/export", { q, status });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">จัดส่งเหรียญ</h2>
          <p className="mt-1 text-sm text-ink/50">แสดงเฉพาะผู้สมัครแพ็กเกจเหรียญกายภาพที่สะสมระยะถึงเป้าหมายแล้ว</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-ink/50 tnum">{regs.length} ผู้สมัคร</span>
          <LinkButton href={exportHref} icon="download">ส่งออก CSV</LinkButton>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">บันทึกการจัดส่งแล้ว</div>}

      <Card>
        <form method="get" className="space-y-4">
          <input type="hidden" name="status" value={status} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/70">ค้นหารายการจัดส่งเหรียญ</label>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
                <Input name="q" defaultValue={q} placeholder="ชื่อ อีเมล งาน BIB ผู้รับ ที่อยู่ ผู้ขนส่ง หรือเลขพัสดุ" className="pl-9" />
              </div>
              <Button type="submit" className="shrink-0" icon="search">ค้นหา</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="กรองสถานะการจัดส่ง">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildUrl("/admin/shipments", { q, status: filter.value })}
                aria-current={status === filter.value ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${status === filter.value ? "bg-ink text-paper" : "border border-lane text-ink/65 hover:bg-lane/50"}`}
              >
                {filter.label}
              </Link>
            ))}
            {(q || status !== "pending") && (
              <Link href="/admin/shipments" className="inline-flex items-center gap-2 rounded-full border border-lane px-4 py-2 text-sm font-semibold transition hover:bg-lane/50">
                <RotateCcw className="size-4" aria-hidden="true" /> ล้างตัวกรอง
              </Link>
            )}
          </div>
        </form>
      </Card>

      {regs.length === 0 ? (
        <Card className="text-center text-ink/50">ไม่พบผู้สมัครที่สะสมระยะถึงเป้าหมายและตรงกับตัวกรองนี้</Card>
      ) : (
        <div className="space-y-3">
          {regs.map((registration) => {
            const shipment = registration.shipment;
            const address = registration.shippingAddress;
            return (
              <Card key={registration.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink/50">{registration.eventTitle} — {registration.packageName}</p>
                    <p className="font-semibold">
                      {registration.user?.name || registration.user?.email || "ไม่ทราบชื่อ"}
                      {registration.bibNumber && <span className="ml-2 font-mono text-xs text-ink/40 tnum">BIB {registration.bibNumber}</span>}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary-dark">
                      สะสม {registration.approvedDistanceKm.toLocaleString("th-TH", { maximumFractionDigits: 2 })} / {registration.targetDistanceKm.toLocaleString("th-TH")} กม. — ครบเป้าหมาย
                    </p>
                    {address ? (
                      <p className="mt-1 text-sm text-ink/55">{address.recipient} · {address.phone}<br />{address.address} {address.province} {address.postal_code}</p>
                    ) : (
                      <p className="mt-1 text-sm font-medium text-red-600">ยังไม่มีที่อยู่จัดส่ง</p>
                    )}
                  </div>
                  <Badge className={statusClass[shipment.status]}>{shipmentStatusLabel[shipment.status]}</Badge>
                </div>

                <form action={updateShipmentStatus} className="grid grid-cols-1 gap-3 border-t border-lane pt-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input type="hidden" name="registration_id" value={registration.id} />
                  <input type="hidden" name="return_q" value={q} />
                  <input type="hidden" name="return_status" value={status} />
                  <div><Label>ผู้ให้บริการขนส่ง</Label><Input name="carrier" defaultValue={shipment.carrier ?? ""} /></div>
                  <div><Label>เลขพัสดุ</Label><Input name="tracking_no" defaultValue={shipment.trackingNo ?? ""} /></div>
                  <div>
                    <Label>สถานะ</Label>
                    <Select name="status" defaultValue={shipment.status}>
                      <option value="pending">รอดำเนินการ</option>
                      <option value="packed">แพ็กแล้ว</option>
                      <option value="shipped">จัดส่งแล้ว</option>
                      <option value="delivered">ถึงแล้ว</option>
                    </Select>
                  </div>
                  <div className="flex items-end"><Button type="submit" className="w-full" icon="save">บันทึก</Button></div>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
