import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { registrationStatusLabel } from "@/lib/admin/registrations";
import { createAdminClient } from "@/lib/supabase/admin";

type Relation<T> = T | T[] | null;

type StaffRegistrationRow = {
  id: string;
  bib_number: string | null;
  status: string;
  registered_at: string;
  users: Relation<{ name: string | null; email: string | null }>;
  packages: Relation<{ name: string }>;
};

const statusClass: Record<string, string> = {
  pending: "bg-medal-soft text-medal",
  confirmed: "bg-primary-soft text-primary-dark",
  cancelled: "bg-red-100 text-red-700",
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

export async function EventStaffRegistrationsTab({
  eventId,
  searchParams,
}: {
  eventId: string;
  searchParams: { registration_q?: string; registration_status?: string };
}) {
  const query = (searchParams.registration_q ?? "").trim();
  const status = ["pending", "confirmed", "cancelled"].includes(
    searchParams.registration_status ?? "",
  )
    ? searchParams.registration_status!
    : "all";
  const db = createAdminClient();
  const { data, error } = await db
    .from("registrations")
    .select("id, bib_number, status, registered_at, users(name, email), packages(name)")
    .eq("event_id", eventId)
    .order("registered_at", { ascending: false });

  if (error) throw new Error(error.message);

  const searchNeedle = normalizeSearchValue(query);
  const registrations = ((data ?? []) as unknown as StaffRegistrationRow[]).filter(
    (registration) => {
      if (status !== "all" && registration.status !== status) return false;
      if (!searchNeedle) return true;
      const user = firstRelation(registration.users);
      const packageRow = firstRelation(registration.packages);
      return [
        user?.name,
        user?.email,
        registration.bib_number,
        packageRow?.name,
        registrationStatusLabel[registration.status],
      ].some((value) => normalizeSearchValue(value).includes(searchNeedle));
    },
  );

  const clearHref = "/admin/events/" + eventId + "?tab=registrations";

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="space-y-4">
          <input type="hidden" name="tab" value="registrations" />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-end">
            <div>
              <Label htmlFor="staff-event-registration-search">ค้นหาผู้สมัคร</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  id="staff-event-registration-search"
                  name="registration_q"
                  defaultValue={query}
                  placeholder="ชื่อ อีเมล BIB หรือแพ็กเกจ"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="staff-event-registration-status">สถานะ</Label>
              <Select
                id="staff-event-registration-status"
                name="registration_status"
                defaultValue={status}
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </Select>
            </div>
            <Button type="submit" className="w-full lg:w-auto" icon="search">
              ค้นหา
            </Button>
          </div>
          {(query || status !== "all") && (
            <Link
              href={clearHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              ล้างการค้นหา
            </Link>
          )}
        </form>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">ผู้สมัครในงานนี้</p>
        <span className="font-mono text-sm text-ink/45 tnum">
          {registrations.length} คน
        </span>
      </div>

      {registrations.length === 0 ? (
        <Card className="text-center text-ink/50">
          ไม่พบผู้สมัครที่ตรงกับเงื่อนไข
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-lane/35 text-xs text-ink/55">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">ผู้สมัคร</th>
                  <th scope="col" className="px-4 py-3 font-semibold">แพ็กเกจ</th>
                  <th scope="col" className="px-4 py-3 font-semibold">BIB</th>
                  <th scope="col" className="px-4 py-3 font-semibold">วันที่สมัคร</th>
                  <th scope="col" className="px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lane">
                {registrations.map((registration) => {
                  const user = firstRelation(registration.users);
                  const packageRow = firstRelation(registration.packages);
                  return (
                    <tr key={registration.id} className="transition hover:bg-lane/20">
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {user?.name || user?.email || "ไม่ทราบชื่อ"}
                        </p>
                        {user?.name && user.email && (
                          <p className="mt-1 text-xs text-ink/50">{user.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">{packageRow?.name ?? "-"}</td>
                      <td className="px-4 py-4 font-mono font-bold text-primary-dark tnum">
                        {registration.bib_number
                          ? "BIB " + registration.bib_number
                          : "รอออก BIB"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm tnum">
                        {new Date(registration.registered_at).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Bangkok",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={statusClass[registration.status] ?? "bg-lane text-muted"}>
                          {registrationStatusLabel[registration.status] ?? registration.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}