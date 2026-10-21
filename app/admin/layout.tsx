import Link from "next/link";
import { HeadingIcon } from "@/components/ui";
import { ADMIN_ROLE_LABELS, requireAdmin } from "@/lib/auth/admin";
import { getLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/shared";
import { getAdminTabs } from "@/lib/admin/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAdmin();
  const locale = await getLocale();
  const tabs = getAdminTabs(role);

  return (
    <div className="admin-type-scale space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-dark">
          Admin
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <HeadingIcon name="dashboard" />
            {tx(locale, "แผงควบคุม", "Admin dashboard")}
          </h1>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark">
            {ADMIN_ROLE_LABELS[role]}
          </span>
        </div>
      </div>
      <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-lane pb-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
          >
            {locale === "en" ? t.labelEn : t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
