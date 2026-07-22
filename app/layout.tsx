import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

// Noto Sans Thai เป็น font เดียวของทั้งระบบ (แทน Space Grotesk/Inter/Space Mono เดิม)
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Virtual Run",
  description: "วิ่ง เก็บระยะ สะสมเหรียญ — ที่ไหน เมื่อไหร่ก็ได้",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} font-sans`}>
        <header className="sticky top-0 z-20 border-b border-lane bg-paper/85 backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-mono text-sm font-bold text-primary">
                VR
              </span>
              <span className="font-display text-lg font-bold tracking-tight">
                VirtualRun
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
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="rounded-lg px-3 py-2 font-medium hover:bg-lane/60"
                    >
                      แผงควบคุม
                    </Link>
                  )}
                  <form action="/auth/signout" method="post">
                    <button className="rounded-lg px-3 py-2 font-medium text-ink/60 hover:bg-lane/60">
                      ออกจากระบบ
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-ink px-4 py-2 font-semibold text-paper hover:bg-ink/90"
                >
                  เข้าสู่ระบบ
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-ink/40">
          © 2026 VirtualRun · Phase 0-1 scaffold
        </footer>
      </body>
    </html>
  );
}
