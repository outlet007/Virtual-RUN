import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { getSystemSettings } from "@/lib/system-settings";
import { lighten, darken } from "@/lib/color";
import { getAdminHome, isAdminRole, type AdminRole } from "@/lib/auth/admin";
import { SiteHeader } from "@/components/site-header";
import { CookieConsent } from "@/components/cookie-consent";
import { sanitizeCookieConsentHtml } from "@/lib/cookie-consent-html";
import {
  getContentBackgroundDisplayStyle,
  getContentBackgroundInsetStyle,
} from "@/lib/content-background";
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
        <SiteHeader
          siteName={settings.site_name}
          logoUrl={settings.logo_url}
          isAuthenticated={Boolean(user)}
          adminHref={adminRole ? getAdminHome(adminRole) : null}
        />
        <div className="relative">
          {settings.content_background_url && (
            <div
              className="pointer-events-none absolute left-0 right-0"
              style={{
                backgroundImage: `url(${JSON.stringify(settings.content_background_url)})`,
                backgroundPosition: `${settings.content_background_position_x}% ${settings.content_background_position_y}%`,
                ...getContentBackgroundDisplayStyle(settings.content_background_display),
                ...getContentBackgroundInsetStyle(
                  settings.content_background_inset_top,
                  settings.content_background_inset_bottom,
                ),
              }}
              aria-hidden="true"
            />
          )}
          {settings.content_overlay_opacity > 0 && (
            <div
              className="pointer-events-none absolute left-0 right-0"
              style={{
                backgroundColor: settings.content_overlay_color,
                opacity: settings.content_overlay_opacity / 100,
                ...getContentBackgroundInsetStyle(
                  settings.content_background_inset_top,
                  settings.content_background_inset_bottom,
                ),
              }}
              aria-hidden="true"
            />
          )}
          <main className="relative z-[1] mx-auto max-w-[1500px] px-3 py-5 sm:px-4 sm:py-8">
            {children}
          </main>
        </div>
        <footer className="mx-auto max-w-[1500px] px-3 py-8 text-center text-xs text-ink/40 sm:px-4 sm:py-10">
          © 2026 {settings.site_name} · Bangkok University. All Rights Reserved.
        </footer>
        <CookieConsent
          enabled={settings.cookie_consent_enabled}
          messageHtml={sanitizeCookieConsentHtml(settings.cookie_consent_message)}
          policyUrl={settings.cookie_policy_url}
          buttonLabel={settings.cookie_consent_button_label}
        />
      </body>
    </html>
  );
}
