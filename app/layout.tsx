import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSystemSettings } from "@/lib/system-settings";
import { lighten, darken } from "@/lib/color";
import { getAdminHome, isAdminRole, type AdminRole } from "@/lib/auth/admin";
import "./globals.css";

// Noto Sans Thai เป็น font เดียวของทั้งระบบ (แทน Space Grotesk/Inter/Space Mono เดิม)
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings();
  return {
    title: settings.site_name,
    description: "วิ่ง เก็บระยะ สะสมเหรียญ — ที่ไหน เมื่อไหร่ก็ได้",
    icons: settings.favicon_url ? { icon: settings.favicon_url } : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let adminRole: AdminRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    adminRole = isAdminRole(profile?.role) ? profile.role : null;
  }

  const settings = await getSystemSettings();
  // ตัวแปร CSS ฉีดจาก settings จริง — เปลี่ยนสีธีมที่ /admin/settings แล้วมีผลทันทีทั้งเว็บ
  // ไม่ต้อง build ใหม่ (ดู tailwind.config.ts ที่ผูก token สีกับตัวแปรชุดนี้)
  const themeVars = {
    "--color-ink": settings.color_ink,
    "--color-primary": settings.color_primary,
    "--color-primary-dark": darken(settings.color_primary, 0.15),
    "--color-primary-soft": lighten(settings.color_primary, 0.9),
    "--color-medal": settings.color_medal,
    "--color-medal-soft": lighten(settings.color_medal, 0.92),
    "--color-accent": settings.color_accent,
  } as React.CSSProperties;

  return (
    <html lang="th" style={themeVars}>
      <body className={`${notoSansThai.variable} font-sans`}>
        <header className="sticky top-0 z-20 border-b border-lane bg-paper/85 backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              {settings.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-ink font-mono text-sm font-bold text-primary">
                  VR
                </span>
              )}
              <span className="font-display text-lg font-bold tracking-tight">
                {settings.site_name}
              </span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
              >
                งานวิ่ง
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
                  >
                    แดชบอร์ด
                  </Link>
                  {adminRole && (
                    <>
                      <Link
                        href={getAdminHome(adminRole)}
                        className="rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
                      >
                        แผงควบคุม
                      </Link>
                    </>
                  )}
                  <form action="/auth/signout" method="post">
                    <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-muted hover:bg-lane/60">
                      <LogOut className="size-4" aria-hidden="true" />
                      ออกจากระบบ
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 font-semibold text-paper hover:bg-ink/90"
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  เข้าสู่ระบบ
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-[1500px] px-4 py-10 text-center text-xs text-ink/40">
          © 2026 {settings.site_name} · Bangkok University. All Rights Reserved.
        </footer>
      </body>
    </html>
  );
}
