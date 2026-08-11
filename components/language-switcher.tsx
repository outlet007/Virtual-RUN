"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/shared";

const languages: Array<{ locale: Locale; label: string }> = [
  { locale: "th", label: "TH" },
  { locale: "en", label: "EN" },
];

function LanguageFlag({ locale }: { locale: Locale }) {
  return (
    <span
      className="inline-flex size-6 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(148,163,184,0.35)] [clip-path:circle(50%)]"
      aria-hidden="true"
    >
      {locale === "th" ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 64 64" className="size-6">
          <path fill="#ed4c5c" d="M52.4 10C47 5 39.9 2 32 2s-15 3-20.4 8zM11.6 54c5.4 5 12.5 8 20.4 8s15-3 20.4-8z" />
          <path fill="#2a5f9e" d="M2 32c0 4.3.9 8.3 2.5 12h55c1.6-3.7 2.5-7.7 2.5-12s-.9-8.3-2.5-12h-55C2.9 23.7 2 27.7 2 32" />
          <path fill="#f9f9f9" d="M11.6 54h40.7c3-2.8 5.5-6.2 7.1-10h-55c1.8 3.8 4.2 7.2 7.2 10m40.8-44H11.6c-3 2.8-5.5 6.2-7.1 10h55c-1.7-3.8-4.1-7.2-7.1-10" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 64 64"
          className="size-6"
        >
          <rect width="64" height="64" fill="#012169" />
          <path d="M0 0l64 64M64 0L0 64" stroke="#fff" strokeWidth="13" />
          <path d="M0 0l64 64M64 0L0 64" stroke="#c8102e" strokeWidth="7" />
          <path d="M32 0v64M0 32h64" stroke="#fff" strokeWidth="21" />
          <path d="M32 0v64M0 32h64" stroke="#c8102e" strokeWidth="12" />
        </svg>
      )}
    </span>
  );
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const active = languages.find((language) => language.locale === locale) ?? languages[0];

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function selectLocale(nextLocale: Locale) {
    setOpen(false);
    if (nextLocale === locale) return;
    setPending(true);
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    setPending(false);
    if (response.ok) router.refresh();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={locale === "th" ? "เปลี่ยนภาษา" : "Change language"}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2.5 font-semibold text-ink transition hover:bg-lane/60 disabled:opacity-60"
      >
        <LanguageFlag locale={active.locale} />
        <span>{active.label}</span>
        <ChevronDown
          className={"size-4 transition " + (open ? "rotate-180" : "")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-36 overflow-hidden rounded-2xl border border-lane bg-paper p-2 shadow-xl"
        >
          {languages.map((language) => (
            <button
              key={language.locale}
              type="button"
              role="menuitemradio"
              aria-checked={language.locale === locale}
              onClick={() => selectLocale(language.locale)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-semibold transition hover:bg-lane/60"
            >
              <LanguageFlag locale={language.locale} />
              <span className="flex-1">{language.label}</span>
              {language.locale === locale && <Check className="size-4 text-primary-dark" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
