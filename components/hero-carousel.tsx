"use client";

import { useEffect, useState } from "react";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { shouldShowDefaultHeroActions } from "@/lib/hero-banner";

type HeroContent = {
  kicker: string;
  title: string | null;
  highlight: string;
  title_suffix: string;
  subtitle: string | null;
  link_url: string | null;
};

type Slide = HeroContent & {
  id: string;
  image_url: string;
  position_x: number;
  position_y: number;
};

export function HeroCarousel({
  slides,
  children,
  locale = "th",
  fallbackSlide,
}: {
  slides: Slide[];
  children?: React.ReactNode;
  locale?: "th" | "en";
  fallbackSlide: HeroContent;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goTo = (i: number) => setActive((i + slides.length) % slides.length);
  const activeSlide = slides[active] ?? fallbackSlide;

  return (
    // full-bleed: ดึงตัวเองออกจากกรอบ max-w ของ <main> ให้รูปกว้างเต็มจอ
    // ส่วนเนื้อหา (children) ด้านในยังคุมความกว้างแบบเดิม (max-w-[1500px]) ไม่ให้ล้นจอ
    <div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-[420px] w-screen overflow-hidden bg-ink sm:min-h-[480px]">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === active ? 1 : 0 }}
          aria-hidden={i !== active}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image_url}
            alt={s.title ?? ""}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${s.position_x}% ${s.position_y}%` }}
          />
        </div>
      ))}

      {/* เนื้อหา hero คงที่ ทับอยู่บนรูปที่เลื่อนอยู่เบื้องหลัง (ไม่มีรูปก็ยังอ่านออกได้ เพราะพื้นหลังเป็น bg-ink) */}
      {slides.length > 0 && (
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/50 to-ink/20" />
      )}
      <div className="relative mx-auto flex min-h-[420px] max-w-[1500px] flex-col justify-center px-4 py-6 sm:min-h-[480px] sm:px-8 sm:py-12">
        <div key={"id" in activeSlide ? activeSlide.id : "fallback"} aria-live="polite">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {activeSlide.kicker}
          </p>
          <h1 className="mt-3 flex max-w-2xl items-start gap-3 font-display text-4xl font-bold leading-tight tracking-tight text-paper sm:text-5xl">
            <Activity className="mt-1 size-8 shrink-0 text-primary sm:size-10" aria-hidden="true" />
            <span>
              {activeSlide.title}
              <br />
              <span className="text-primary">{activeSlide.highlight}</span>{" "}
              {activeSlide.title_suffix}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[#FFFFFF]">{activeSlide.subtitle}</p>
        </div>
        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {shouldShowDefaultHeroActions(activeSlide.link_url) && children}
          {activeSlide.link_url && (
            <LinkButton href={activeSlide.link_url} variant="primary" icon="next">
              {locale === "en" ? "View details" : "ดูรายละเอียด"}
            </LinkButton>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label={locale === "en" ? "Previous" : "ก่อนหน้า"}
            className="absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-paper transition hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:left-6 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={2.25} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label={locale === "en" ? "Next" : "ถัดไป"}
            className="absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-paper transition hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:right-6 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={2.25} aria-hidden="true" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`สไลด์ที่ ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === active
                    ? "w-6 bg-primary hover:bg-primary-hover"
                    : "w-2 bg-paper/60 hover:bg-paper/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
