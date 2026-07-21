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
  pending: "bg-lane text-ink/60",
  packed: "bg-medal-soft text-medal",
  shipped: "bg-primary-soft text-primary-dark",
  delivered: "bg-primary text-white",
};

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const db = createAdminClient();

  const { data } = await db
    .from("registrations")
    .select(
      "id, bib_number, shipping_address, users(name, email), packages!inner(name, has_physical_medal), events(title), shipments(carrier, tracking_no, status)",
    )
    .eq("status", "confirmed")
    .eq("packages.has_physical_medal", true)
    .order("registered_at", { ascending: true });

  const regs = (data ?? []) as unknown as RegRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">จัดส่งเหรียญ</h2>
        <span className="font-mono text-sm text-ink/40 tnum">{regs.length} ใบสมัคร</span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          บันทึกแล้ว
        </div>
      )}

      {regs.length === 0 ? (
        <Card className="text-center text-ink/50">ยังไม่มีใบสมัครที่ต้องจัดส่งเหรียญ</Card>
      ) : (
        <div className="space-y-3">
          {regs.map((r) => {
            const shipment = Array.isArray(r.shipments) ? r.shipments[0] : r.shipments;
            const addr = r.shipping_address;
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
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
                    <Button type="submit" className="w-full">
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
