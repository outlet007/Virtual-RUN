"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LinkButton } from "@/components/ui";
import { tx, type Locale } from "@/lib/i18n/shared";

type SiteHeaderProps = {
  siteName: string;
  logoUrl: string | null;
  showSiteName: boolean;
  isAuthenticated: boolean;
  adminHref: string | null;
  locale: Locale;
};

export function SiteHeader({
  siteName,
  logoUrl,
  showSiteName,
  isAuthenticated,
  adminHref,
  locale,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const links = (
    <>
      <Link href="/" onClick={() => setOpen(false)}>
        {tx(locale, "งานที่เปิดรับสมัคร", "Events")}
      </Link>
      <Link href="/articles" onClick={() => setOpen(false)}>
        {tx(locale, "บทความและเกร็ดความรู้", "Articles")}
      </Link>
      {isAuthenticated && (
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          {tx(locale, "แดชบอร์ด", "Dashboard")}
        </Link>
      )}
      {adminHref && (
        <Link href={adminHref} onClick={() => setOpen(false)}>
          {tx(locale, "แผงควบคุม", "Admin")}
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-lane bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex min-h-16 max-w-[1500px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={showSiteName ? "" : siteName}
              className="h-12 w-auto max-w-[min(11rem,45vw)] shrink-0 object-contain sm:max-w-52"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-mono text-sm font-bold text-primary">
              VR
            </span>
          )}
          {showSiteName && (
            <span className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
              {siteName}
            </span>
          )}
        </Link>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-main-menu"
          aria-label={open ? tx(locale, "ปิดเมนูหลัก", "Close main menu") : tx(locale, "เปิดเมนูหลัก", "Open main menu")}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lane text-ink transition hover:bg-lane/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>

        <div className="hidden items-center gap-1 text-sm lg:flex">
          <div className="contents [&_a]:whitespace-nowrap [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:font-medium [&_a]:transition [&_a:hover]:bg-lane/60">
            {links}
          </div>
          <LanguageSwitcher locale={locale} />
          <span className="mx-1 text-ink/30" aria-hidden="true">|</span>
          {isAuthenticated ? (
            <form action="/auth/signout" method="post">
              <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-medium text-muted hover:bg-lane/60">
                <LogOut className="size-4" aria-hidden="true" />
                {tx(locale, "ออกจากระบบ", "Sign out")}
              </button>
            </form>
          ) : (
            <>
              <LinkButton href="/signup" variant="ink" icon="userPlus">
                {tx(locale, "สมัครสมาชิก", "Sign up")}
              </LinkButton>
              <LinkButton href="/login" variant="ghost" icon="login">
                {tx(locale, "เข้าสู่ระบบ", "Sign in")}
              </LinkButton>
            </>
          )}
        </div>

        <div
          id="mobile-main-menu"
          className={"order-3 w-full border-t border-lane pt-2 lg:hidden " + (open ? "block" : "hidden")}
        >
          <div className="grid gap-1 text-sm">
            <div className="grid gap-1 [&_a]:rounded-xl [&_a]:px-4 [&_a]:py-3 [&_a]:font-medium [&_a]:transition [&_a:hover]:bg-lane/60">
              {links}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 border-y border-lane py-2">
              <LanguageSwitcher locale={locale} />
              <span className="text-ink/30" aria-hidden="true">|</span>
            </div>
            {isAuthenticated ? (
              <form action="/auth/signout" method="post">
                <button className="inline-flex min-h-11 w-full items-center gap-2 rounded-xl px-4 py-3 text-left font-medium text-muted transition hover:bg-lane/60">
                  <LogOut className="size-4 shrink-0" aria-hidden="true" />
                  {tx(locale, "ออกจากระบบ", "Sign out")}
                </button>
              </form>
            ) : (
              <>
                <LinkButton href="/signup" variant="ink" icon="userPlus" onClick={() => setOpen(false)}>
                  {tx(locale, "สมัครสมาชิก", "Sign up")}
                </LinkButton>
                <LinkButton href="/login" variant="ghost" icon="login" onClick={() => setOpen(false)}>
                  {tx(locale, "เข้าสู่ระบบ", "Sign in")}
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
