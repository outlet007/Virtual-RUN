"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { CategoryBadge } from "@/components/articles/category-badge";

export type FeaturedArticleSlide = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bannerImageUrl: string | null;
  bannerPositionX: number;
  bannerPositionY: number;
  categoryName: string | null;
  categoryBackgroundColor: string | null;
  categoryTextColor: string | null;
};

export function FeaturedArticleBanner({
  slides,
}: {
  slides: FeaturedArticleSlide[];
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const goTo = (index: number) => {
    setActive((index + slides.length) % slides.length);
  };

  return (
    <section
      aria-label="บทความที่ปักหมุด"
      className="relative left-1/2 right-1/2 -mx-[50vw] -mt-5 min-h-[420px] w-screen overflow-hidden bg-ink sm:-mt-8 sm:min-h-[480px]"
    >
      {slides.map((slide, index) => (
        <Link
          key={slide.id}
          href={`/articles/${slide.slug}`}
          aria-hidden={index !== active}
          tabIndex={index === active ? 0 : -1}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === active
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          {slide.bannerImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.bannerImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: `${slide.bannerPositionX}% ${slide.bannerPositionY}%`,
              }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-ink">
              <Newspaper className="size-20 text-primary/35" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/15"
            aria-hidden="true"
          />
          <div className="relative mx-auto flex min-h-[420px] max-w-[1500px] items-end px-4 pb-14 pt-8 text-paper sm:min-h-[480px] sm:px-8 sm:pb-16">
            <div className="max-w-4xl">
              {slide.categoryName && (
                <CategoryBadge
                  backgroundColor={slide.categoryBackgroundColor}
                  textColor={slide.categoryTextColor}
                  className="mb-3 px-3 py-1 text-sm font-bold shadow-sm"
                >
                  {slide.categoryName}
                </CategoryBadge>
              )}
              <h2 className="font-display text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl">
                {slide.title}
              </h2>
              {slide.excerpt && (
                <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
                  {slide.excerpt}
                </p>
              )}
              <span className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2 text-sm font-bold text-ink transition hover:bg-primary-hover">
                อ่านบทความ
              </span>
            </div>
          </div>
        </Link>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="บทความก่อนหน้า"
            className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-paper transition hover:bg-ink/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:left-5"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="บทความถัดไป"
            className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-paper transition hover:bg-ink/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:right-5"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`แสดงบทความที่ปักหมุดลำดับ ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${
                  index === active
                    ? "w-7 bg-primary hover:bg-primary-hover"
                    : "w-2 bg-paper/60 hover:bg-paper/85"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
