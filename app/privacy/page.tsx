import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public-legal-page";
import { getLocale } from "@/lib/i18n/server";
import { getSystemSettings } from "@/lib/system-settings";
import {
  normalizePrivacyContactEmail,
  PRIVACY_NOTICE,
  PUBLIC_LEGAL_PATHS,
} from "@/lib/public-legal-pages";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | Virtual RUN",
  description: "Privacy Notice for the Virtual RUN service.",
  alternates: { canonical: PUBLIC_LEGAL_PATHS.privacy },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const [locale, settings] = await Promise.all([getLocale(), getSystemSettings()]);
  return (
    <PublicLegalPage
      document={PRIVACY_NOTICE}
      locale={locale}
      titleTh={settings.privacy_header_title}
      titleEn={settings.privacy_header_title_en}
      subtitleTh={settings.privacy_header_subtitle}
      subtitleEn={settings.privacy_header_subtitle_en}
      bodyTh={settings.privacy_policy_text}
      bodyEn={settings.privacy_policy_text_en}
      contactTextTh={settings.privacy_contact_text}
      contactTextEn={settings.privacy_contact_text_en}
      contactEmail={normalizePrivacyContactEmail(process.env.PRIVACY_CONTACT_EMAIL)}
    />
  );
}
