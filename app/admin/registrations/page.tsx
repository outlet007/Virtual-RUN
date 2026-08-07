import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { Badge, Button, Card, Input, Label, LinkButton, Select } from "@/components/ui";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  getAdminSystemUsers,
  normalizeAccountType,
  type AccountType,
} from "@/lib/admin/users";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const accountTypeClass: Record<AccountType, string> = {
  user: "bg-primary-soft text-primary-dark",
  staff: "bg-sky-100 text-sky-700",
  admin: "bg-medal-soft text-medal",
  super_admin: "bg-ink text-paper",
};

function userInitials(name: string | null, email: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; accountType?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const accountType = normalizeAccountType(sp.accountType);
  const users = await getAdminSystemUsers({ q, accountType });

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (accountType !== "all") exportParams.set("accountType", accountType);
  const exportQuery = exportParams.toString();
  const exportHref = `/admin/registrations/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">จัดการผู้สมัคร</h2>
          <p className="mt-1 text-sm text-ink/55">
            รายชื่อผู้ใช้งานทั้งหมดและประเภทบัญชีในระบบ Virtual RUN
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-ink/40 tnum">
            {users.length} บัญชีผู้ใช้
          </span>
          <LinkButton href={exportHref} icon="download">
            Export CSV
          </LinkButton>
        </div>
      </div>

      <Card>
        <form method="get" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
            <div>
              <Label htmlFor="user-search">ค้นหาผู้ใช้งาน</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                  aria-hidden="true"
                />
                <Input
                  id="user-search"
                  name="q"
                  defaultValue={q}
                  placeholder="ชื่อ อีเมล โทรศัพท์ LINE จังหวัด หรือรหัสไปรษณีย์"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="account-type">ประเภทบัญชี</Label>
              <Select id="account-type" name="accountType" defaultValue={accountType}>
                <option value="all">ทุกประเภทบัญชี</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="w-full lg:w-auto" icon="search">
              ค้นหา
            </Button>
          </div>

          {(q || accountType !== "all") && (
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

      {users.length === 0 ? (
        <Card className="text-center text-ink/50">ไม่พบบัญชีผู้ใช้ที่ตรงกับเงื่อนไข</Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <caption className="sr-only">รายชื่อบัญชีผู้ใช้งานทั้งหมดในระบบ</caption>
              <thead className="bg-lane/35 text-xs text-ink/55">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">ผู้ใช้งาน</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ข้อมูลติดต่อ</th>
                  <th scope="col" className="px-4 py-3 font-semibold">LINE</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ที่อยู่</th>
                  <th scope="col" className="px-4 py-3 font-semibold">วันที่สมัครระบบ</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ประเภทบัญชี</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lane">
                {users.map((user) => (
                  <tr key={user.id} className="align-top transition hover:bg-lane/20">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary-dark"
                          aria-hidden="true"
                        >
                          {userInitials(user.name, user.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{user.name || "ยังไม่ระบุชื่อ"}</p>
                          <p className="mt-1 max-w-[260px] truncate text-xs text-ink/50">
                            {user.email || "ไม่มีอีเมล"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-ink/75">{user.email || "ไม่มีอีเมล"}</p>
                      <p className="mt-1 font-mono text-xs text-ink/50 tnum">
                        {user.phone || "ไม่มีเบอร์โทรศัพท์"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-ink/65">
                      {user.line_user_id || "ยังไม่เชื่อมต่อ"}
                    </td>
                    <td className="max-w-[320px] px-4 py-4 text-xs leading-5 text-ink/60">
                      {user.address || user.province || user.postal_code ? (
                        <>
                          {user.address && <p>{user.address}</p>}
                          <p className={user.address ? "mt-1" : undefined}>
                            {[user.province, user.postal_code].filter(Boolean).join(" ")}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink/35">ยังไม่ระบุที่อยู่</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-mono text-sm tnum">
                        {new Date(user.created_at).toLocaleDateString("th-TH", {
                          timeZone: "Asia/Bangkok",
                        })}
                      </p>
                      <p className="mt-1 font-mono text-xs text-ink/45 tnum">
                        {new Date(user.created_at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Bangkok",
                        })} น.
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={accountTypeClass[user.role]}>
                        {ACCOUNT_TYPE_LABELS[user.role]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
