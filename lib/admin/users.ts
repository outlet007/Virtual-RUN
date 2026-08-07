import { createAdminClient } from "@/lib/supabase/admin";

export const ACCOUNT_TYPES = ["user", "staff", "admin", "super_admin"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type AccountTypeFilter = AccountType | "all";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  user: "ผู้ใช้งานทั่วไป",
  staff: "เจ้าหน้าที่",
  admin: "ผู้ดูแลระบบ",
  super_admin: "ผู้ดูแลระบบสูงสุด",
};

export type AdminSystemUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  line_user_id: string | null;
  address: string | null;
  province: string | null;
  postal_code: string | null;
  created_at: string;
  role: AccountType;
};

export type AdminSystemUserFilters = {
  q?: string;
  accountType?: string;
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

export function normalizeAccountType(value: string | undefined): AccountTypeFilter {
  return ACCOUNT_TYPES.includes(value as AccountType) ? (value as AccountType) : "all";
}

export async function getAdminSystemUsers(filters: AdminSystemUserFilters = {}) {
  const db = createAdminClient();
  const accountType = normalizeAccountType(filters.accountType);
  let query = db
    .from("users")
    .select(
      "id, name, email, phone, line_user_id, address, province, postal_code, created_at, role",
    )
    .order("created_at", { ascending: false });

  if (accountType !== "all") query = query.eq("role", accountType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const users = (data ?? []) as AdminSystemUserRow[];
  const searchNeedle = normalizeSearchValue(filters.q);
  if (!searchNeedle) return users;

  return users.filter((user) =>
    [
      user.name,
      user.email,
      user.phone,
      user.line_user_id,
      user.address,
      user.province,
      user.postal_code,
      ACCOUNT_TYPE_LABELS[user.role],
    ].some((value) => normalizeSearchValue(value).includes(searchNeedle)),
  );
}
