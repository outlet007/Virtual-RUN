import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public-legal-page";
import { getLocale } from "@/lib/i18n/server";
import { getSystemSettings } from "@/lib/system-settings";
import {
  normalizePrivacyContactEmail,
  PUBLIC_LEGAL_PATHS,
  TERMS_OF_SERVICE,
} from "@/lib/public-legal-pages";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน | Virtual RUN",
  description: "Terms of Service for the Virtual RUN service.",
  alternates: { canonical: PUBLIC_LEGAL_PATHS.terms },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const [locale, settings] = await Promise.all([getLocale(), getSystemSettings()]);
  return (
    <PublicLegalPage
      document={TERMS_OF_SERVICE}
      locale={locale}
      titleTh={settings.terms_header_title}
      titleEn={settings.terms_header_title_en}
      subtitleTh={settings.terms_header_subtitle}
      subtitleEn={settings.terms_header_subtitle_en}
      bodyTh={settings.terms_of_service_text}
      bodyEn={settings.terms_of_service_text_en}
      contactTextTh={settings.terms_contact_text}
      contactTextEn={settings.terms_contact_text_en}
      contactEmail={normalizePrivacyContactEmail(process.env.PRIVACY_CONTACT_EMAIL)}
    />
  );
}
