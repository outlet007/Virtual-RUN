import Link from "next/link";
import { FileText, ShieldCheck, UserRoundX } from "lucide-react";
import { Card, LinkButton } from "@/components/ui";
import type { Locale } from "@/lib/i18n/shared";
import { getLocalizedLegalContactText, getLocalizedLegalCopy } from "@/lib/legal-settings";
import {
  PUBLIC_LEGAL_PATHS,
  type PublicLegalDocument,
} from "@/lib/public-legal-pages";

const legalNavigation = [
  { href: PUBLIC_LEGAL_PATHS.privacy, label: "นโยบายความเป็นส่วนตัว", labelEn: "Privacy" },
  { href: PUBLIC_LEGAL_PATHS.terms, label: "ข้อกำหนดการใช้งาน", labelEn: "Terms" },
  { href: PUBLIC_LEGAL_PATHS.dataDeletion, label: "การลบข้อมูล", labelEn: "Data Deletion" },
] as const;

const documentIcons = {
  privacy: ShieldCheck,
  terms: FileText,
  "data-deletion": UserRoundX,
} as const;

export function PublicLegalPage({
  document,
  locale,
  titleTh,
  titleEn,
  subtitleTh,
  subtitleEn,
  bodyTh,
  bodyEn,
  contactTextTh,
  contactTextEn,
  contactEmail,
}: {
  document: PublicLegalDocument;
  locale: Locale;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  bodyTh: string;
  bodyEn: string;
  contactTextTh: string;
  contactTextEn: string;
  contactEmail: string | null;
}) {
  const Icon = documentIcons[document.slug];
  const copy = getLocalizedLegalCopy(
    document,
    locale,
    bodyTh,
    bodyEn,
    titleTh,
    titleEn,
    subtitleTh,
    subtitleEn,
  );
  const contactText = getLocalizedLegalContactText(locale, contactTextTh, contactTextEn);
  const hasContact = document.sections.some((section) => section.showContact);

  return (
    <article className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <header className="overflow-hidden rounded-3xl bg-ink px-5 py-8 text-white shadow-sm sm:px-8 sm:py-10">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-ink sm:size-14">
            <Icon className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Virtual RUN · Bangkok University
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-4xl">
              <span lang={locale}>{copy.title}</span>
            </h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-white/80" lang={locale}>
          {copy.summary}
        </p>
        <p className="mt-5 text-xs text-white/55">
          {locale === "en" ? "Last updated" : "อัปเดตล่าสุด"}: {copy.lastUpdated}
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-2 rounded-2xl border border-lane bg-white p-3"
        aria-label={locale === "en" ? "Legal documents" : "เอกสารทางกฎหมาย"}
      >
        {legalNavigation.map((item) => {
          const isActive = item.href === `/${document.slug}`;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive ? "bg-primary text-ink" : "text-ink/65 hover:bg-lane/60 hover:text-ink"
              }`}
            >
              {locale === "en" ? item.labelEn : item.label}
            </Link>
          );
        })}
      </nav>

      <section aria-label={copy.title}>
        <Card className="p-5 sm:p-7">
          <div
            lang={locale}
            className="prose prose-sm max-w-none leading-8 text-ink/75 prose-headings:font-display prose-headings:text-ink prose-a:text-primary-dark prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: copy.body }}
          />

          {hasContact && (
            <div className="mt-5 rounded-2xl border border-primary/40 bg-primary-soft p-4 text-sm leading-6 text-ink/75">
              <p lang={locale}>{contactText}</p>
              {contactEmail && (
                <p className="mt-2">
                  <a className="font-bold underline underline-offset-2" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                </p>
              )}
            </div>
          )}
        </Card>
      </section>

      <div className="flex justify-center pt-2">
        <LinkButton href="/" variant="ghost" icon="back">
          {locale === "en" ? "Back to home" : "กลับหน้าหลัก"}
        </LinkButton>
      </div>
    </article>
  );
}
