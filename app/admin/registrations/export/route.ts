import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ACCOUNT_TYPE_LABELS, getAdminSystemUsers } from "@/lib/admin/users";
import { createUtf8BomCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const users = await getAdminSystemUsers({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    accountType: request.nextUrl.searchParams.get("accountType") ?? undefined,
  });

  const rows = users.map((user) => [
    user.name ?? "",
    user.email ?? "",
    user.phone ?? "",
    user.line_user_id ?? "",
    user.address ?? "",
    user.province ?? "",
    user.postal_code ?? "",
    ACCOUNT_TYPE_LABELS[user.role],
    new Date(user.created_at).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
    }),
  ]);

  const csv = createUtf8BomCsv([
    [
      "ชื่อผู้ใช้งาน",
      "อีเมล",
      "โทรศัพท์",
      "LINE User ID",
      "ที่อยู่",
      "จังหวัด",
      "รหัสไปรษณีย์",
      "ประเภทบัญชี",
      "วันที่สมัครระบบ",
    ],
    ...rows,
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="virtual-run-users-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
