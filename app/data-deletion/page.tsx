import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public-legal-page";
import { getLocale } from "@/lib/i18n/server";
import { getSystemSettings } from "@/lib/system-settings";
import {
  DATA_DELETION_INSTRUCTIONS,
  normalizePrivacyContactEmail,
  PUBLIC_LEGAL_PATHS,
} from "@/lib/public-legal-pages";

export const metadata: Metadata = {
  title: "คำแนะนำการลบข้อมูล | Virtual RUN",
  description: "Instructions for requesting deletion of a Virtual RUN account and associated data.",
  alternates: { canonical: PUBLIC_LEGAL_PATHS.dataDeletion },
  robots: { index: true, follow: true },
};

export default async function DataDeletionPage() {
  const [locale, settings] = await Promise.all([getLocale(), getSystemSettings()]);
  return (
    <PublicLegalPage
      document={DATA_DELETION_INSTRUCTIONS}
      locale={locale}
      titleTh={settings.data_deletion_header_title}
      titleEn={settings.data_deletion_header_title_en}
      subtitleTh={settings.data_deletion_header_subtitle}
      subtitleEn={settings.data_deletion_header_subtitle_en}
      bodyTh={settings.data_deletion_text}
      bodyEn={settings.data_deletion_text_en}
      contactTextTh={settings.data_deletion_contact_text}
      contactTextEn={settings.data_deletion_contact_text_en}
      contactEmail={normalizePrivacyContactEmail(process.env.PRIVACY_CONTACT_EMAIL)}
    />
  );
}
