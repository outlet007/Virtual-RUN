import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { Badge, Button, Card, Input, Label, LinkButton, Select } from "@/components/ui";
import { manuallyApproveRegistration } from "@/lib/actions/admin-registrations";
import {
  getAdminRegistrations,
  getRegistrationEventOptions,
  registrationStatusLabel,
} from "@/lib/admin/registrations";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const statusClass: Record<string, string> = {
  pending: "bg-medal-soft text-medal",
  confirmed: "bg-primary-soft text-primary-dark",
  cancelled: "bg-red-100 text-red-700",
};

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    approved?: string;
    error?: string;
    event?: string;
    q?: string;
    status?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const eventId = sp.event && sp.event !== "all" ? sp.event : "";
  const status = sp.status ?? "all";

  const [registrations, events] = await Promise.all([
    getAdminRegistrations({ q, eventId, status }),
    getRegistrationEventOptions(),
  ]);

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (eventId) exportParams.set("event", eventId);
  if (status !== "all") exportParams.set("status", status);
  const exportQuery = exportParams.toString();
  const exportHref = `/admin/registrations/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">จัดการผู้สมัคร</h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-ink/40 tnum">
            {registrations.length} ผู้สมัคร
          </span>
          <LinkButton href={exportHref} variant="ghost" icon="download">
            Export CSV
          </LinkButton>
        </div>
      </div>

      {sp.approved && (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-dark">
          ยืนยันผู้สมัครและออกหมายเลข BIB แล้ว
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}

      <Card>
        <form method="get" className="space-y-4">
          <div>
            <Label htmlFor="registration-search">ค้นหาผู้สมัคร</Label>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  id="registration-search"
                  name="q"
                  defaultValue={q}
                  placeholder="ชื่อผู้สมัคร อีเมล BIB งาน หรือแพ็กเกจ"
                  className="pl-9"
                />
              </div>
              <Button type="submit" className="shrink-0" icon="search">
                ค้นหา
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="registration-event">งาน</Label>
              <Select id="registration-event" name="event" defaultValue={eventId || "all"}>
                <option value="all">ทุกงาน</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="registration-status">สถานะ</Label>
              <Select id="registration-status" name="status" defaultValue={status}>
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </Select>
            </div>
          </div>

          {(q || eventId || status !== "all") && (
            <Link
              href="/admin/registrations"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              ล้างการค้นหา
            </Link>
          )}
        </form>
      </Card>

      {registrations.length === 0 ? (
        <Card className="text-center text-ink/50">ไม่พบผู้สมัครที่ตรงกับเงื่อนไข</Card>
      ) : (
        <div className="space-y-3">
          {registrations.map((registration) => {
            const address = registration.shipping_address;
            return (
              <Card key={registration.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink/50">
                      {registration.events?.title} — {registration.packages?.name}
                    </p>
                    <p className="font-semibold">
                      {registration.users?.name || registration.users?.email || "ไม่ทราบชื่อ"}
                    </p>
                    {registration.users?.name && registration.users.email && (
                      <p className="text-sm text-ink/50">{registration.users.email}</p>
                    )}
                    <p className="mt-1 font-mono text-xs text-ink/40 tnum">
                      สมัครเมื่อ{" "}
                      {new Date(registration.registered_at).toLocaleString("th-TH", {
                        timeZone: "Asia/Bangkok",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {registration.bib_number && (
                      <span className="font-mono text-sm font-bold text-primary-dark tnum">
                        BIB {registration.bib_number}
                      </span>
                    )}
                    <Badge className={statusClass[registration.status]}>
                      {registrationStatusLabel[registration.status] ?? registration.status}
                    </Badge>
                  </div>
                </div>

                {address && (
                  <div className="border-t border-lane pt-3 text-sm text-ink/60">
                    <p className="font-medium text-ink/70">ที่อยู่จัดส่ง</p>
                    <p>
                      {address.recipient} · {address.phone}
                      <br />
                      {address.address} {address.province} {address.postal_code}
                    </p>
                  </div>
                )}

                {registration.status === "pending" && (
                  <form action={manuallyApproveRegistration} className="border-t border-lane pt-3">
                    <input type="hidden" name="registration_id" value={registration.id} />
                    <Button type="submit" icon="userCheck">
                      ยืนยันผู้สมัครและออก BIB
                    </Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
