import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Badge, Button, Input, Label, Select } from "@/components/ui";
import { upsertShipment } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type ShippingAddress = {
  recipient: string;
  phone: string;
  address: string;
  province: string;
  postal_code: string;
} | null;

type Shipment = { carrier: string | null; tracking_no: string | null; status: string } | null;

type RegRow = {
  id: string;
  bib_number: string | null;
  shipping_address: ShippingAddress;
  users: { name: string | null; email: string | null } | null;
  packages: { name: string } | null;
  events: { title: string } | null;
  shipments: Shipment | Shipment[];
};

const statusLabel: Record<string, string> = {
  pending: "รอดำเนินการ",
  packed: "แพ็คแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "ถึงแล้ว",
};
const statusClass: Record<string, string> = {
  pending: "bg-lane text-muted",
  packed: "bg-medal-soft text-medal",
  shipped: "bg-primary-soft text-primary-dark",
  delivered: "bg-primary text-ink",
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string }>;
}) {
  const { saved, error, q: rawQuery } = await searchParams;
  const q = (rawQuery ?? "").trim();
  const db = createAdminClient();

  const { data } = await db
    .from("registrations")
    .select(
      "id, bib_number, shipping_address, users(name, email), packages!inner(name, has_physical_medal), events(title), shipments(carrier, tracking_no, status)",
    )
    .eq("status", "confirmed")
    .eq("packages.has_physical_medal", true)
    .order("registered_at", { ascending: true });

  const registrationRows = (data ?? []) as unknown as RegRow[];
  const searchNeedle = normalizeSearchValue(q);
  const regs = searchNeedle
    ? registrationRows.filter((registration) => {
        const shipment = Array.isArray(registration.shipments)
          ? registration.shipments[0]
          : registration.shipments;
        const address = registration.shipping_address;
        const shipmentStatus = shipment?.status ?? "pending";

        return [
          registration.users?.name,
          registration.users?.email,
          registration.events?.title,
          registration.packages?.name,
          registration.bib_number,
          address?.recipient,
          address?.phone,
          address?.address,
          address?.province,
          address?.postal_code,
          shipment?.carrier,
          shipment?.tracking_no,
          shipmentStatus,
          statusLabel[shipmentStatus],
        ].some((value) => normalizeSearchValue(value).includes(searchNeedle));
      })
    : registrationRows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">จัดส่งเหรียญ</h2>
        <span className="font-mono text-sm text-ink/40 tnum">{regs.length} ผู้สมัคร</span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกแล้ว
        </div>
      )}

      <Card>
        <form method="get" className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/70">
              ค้นหารายการจัดส่งเหรียญ
            </label>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="ชื่อ อีเมล งาน BIB ผู้รับ ที่อยู่ ผู้ขนส่ง หรือเลขพัสดุ"
                  className="pl-9"
                />
              </div>
              <Button type="submit" className="shrink-0" icon="search">ค้นหา</Button>
            </div>
          </div>
          {q && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/shipments"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
              >
                <RotateCcw className="size-4" aria-hidden="true" />

                ล้างการค้นหา
              </Link>
            </div>
          )}
        </form>
      </Card>

      {regs.length === 0 ? (
        <Card className="text-center text-ink/50">
          {q ? "ไม่พบรายการจัดส่งที่ตรงกับการค้นหา" : "ยังไม่มีผู้สมัครที่ต้องจัดส่งเหรียญ"}
        </Card>
      ) : (
        <div className="space-y-3">
          {regs.map((r) => {
            const shipment = Array.isArray(r.shipments) ? r.shipments[0] : r.shipments;
            const addr = r.shipping_address;
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink/50">
                      {r.events?.title} — {r.packages?.name}
                    </p>
                    <p className="font-semibold">
                      {r.users?.name || r.users?.email || "ไม่ทราบชื่อ"}
                      {r.bib_number && (
                        <span className="ml-2 font-mono text-xs text-ink/40 tnum">
                          BIB {r.bib_number}
                        </span>
                      )}
                    </p>
                    {addr && (
                      <p className="mt-1 text-sm text-ink/55">
                        {addr.recipient} · {addr.phone}
                        <br />
                        {addr.address} {addr.province} {addr.postal_code}
                      </p>
                    )}
                  </div>
                  <Badge className={statusClass[shipment?.status ?? "pending"]}>
                    {statusLabel[shipment?.status ?? "pending"]}
                  </Badge>
                </div>

                <form
                  action={upsertShipment}
                  className="grid grid-cols-1 gap-3 border-t border-lane pt-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <input type="hidden" name="registration_id" value={r.id} />
                  <div>
                    <Label>ผู้ให้บริการขนส่ง</Label>
                    <Input name="carrier" defaultValue={shipment?.carrier ?? ""} />
                  </div>
                  <div>
                    <Label>เลขพัสดุ</Label>
                    <Input name="tracking_no" defaultValue={shipment?.tracking_no ?? ""} />
                  </div>
                  <div>
                    <Label>สถานะ</Label>
                    <Select name="status" defaultValue={shipment?.status ?? "pending"}>
                      <option value="pending">รอดำเนินการ</option>
                      <option value="packed">แพ็คแล้ว</option>
                      <option value="shipped">จัดส่งแล้ว</option>
                      <option value="delivered">ถึงแล้ว</option>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full" icon="save">
                      บันทึก
                    </Button>
                  </div>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
