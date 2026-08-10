"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Menu, X } from "lucide-react";

type SiteHeaderProps = {
  siteName: string;
  logoUrl: string | null;
  isAuthenticated: boolean;
  adminHref: string | null;
};

export function SiteHeader({
  siteName,
  logoUrl,
  isAuthenticated,
  adminHref,
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
        งานที่เปิดรับสมัคร
      </Link>
      <Link href="/articles" onClick={() => setOpen(false)}>
        บทความและเกร็ดความรู้
      </Link>
      {isAuthenticated && (
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          แดชบอร์ด
        </Link>
      )}
      {adminHref && (
        <Link href={adminHref} onClick={() => setOpen(false)}>
          แผงควบคุม
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
            <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-mono text-sm font-bold text-primary">
              VR
            </span>
          )}
          <span className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
            {siteName}
          </span>
        </Link>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-main-menu"
          aria-label={open ? "ปิดเมนูหลัก" : "เปิดเมนูหลัก"}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lane text-ink transition hover:bg-lane/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>

        <div className="hidden items-center gap-1 text-sm lg:flex">
          <div className="contents [&_a]:whitespace-nowrap [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:font-medium [&_a]:transition [&_a:hover]:bg-lane/60">
            {links}
          </div>
          {isAuthenticated ? (
            <form action="/auth/signout" method="post">
              <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-medium text-muted hover:bg-lane/60">
                <LogOut className="size-4" aria-hidden="true" />
                ออกจากระบบ
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-ink px-4 py-2 font-semibold text-paper hover:bg-ink/90"
            >
              <LogIn className="size-4" aria-hidden="true" />
              เข้าสู่ระบบ
            </Link>
          )}
        </div>

        <div
          id="mobile-main-menu"
          className={"order-3 w-full border-t border-lane pt-2 lg:hidden " + (open ? "block" : "hidden")}
        >
          <div className="grid gap-1 text-sm [&_a]:rounded-xl [&_a]:px-4 [&_a]:py-3 [&_a]:font-medium [&_a]:transition [&_a:hover]:bg-lane/60">
            {links}
            {isAuthenticated ? (
              <form action="/auth/signout" method="post">
                <button className="inline-flex min-h-11 w-full items-center gap-2 rounded-xl px-4 py-3 text-left font-medium text-muted transition hover:bg-lane/60">
                  <LogOut className="size-4 shrink-0" aria-hidden="true" />
                  ออกจากระบบ
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 bg-ink font-semibold text-paper hover:bg-ink/90"
              >
                <LogIn className="size-4 shrink-0" aria-hidden="true" />
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
