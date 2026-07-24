"use client";

import { useEffect, useState } from "react";

type Slide = {
  id: string;
  image_url: string;
  title: string | null;
};

export function HeroCarousel({
  slides,
  children,
}: {
  slides: Slide[];
  children?: React.ReactNode;
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

  return (
    // full-bleed: ดึงตัวเองออกจากกรอบ max-w ของ <main> ให้รูปกว้างเต็มจอ
    // ส่วนเนื้อหา (children) ด้านในยังคุมความกว้างแบบเดิม (max-w-[1104px]) ไม่ให้ล้นจอ
    <div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-[420px] w-screen overflow-hidden bg-ink sm:min-h-[480px]">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === active ? 1 : 0 }}
          aria-hidden={i !== active}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image_url} alt={s.title ?? ""} className="h-full w-full object-cover" />
        </div>
      ))}

      {/* เนื้อหา hero คงที่ ทับอยู่บนรูปที่เลื่อนอยู่เบื้องหลัง (ไม่มีรูปก็ยังอ่านออกได้ เพราะพื้นหลังเป็น bg-ink) */}
      {slides.length > 0 && (
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/50 to-ink/20" />
      )}
      <div className="relative mx-auto flex min-h-[420px] max-w-[1104px] flex-col justify-center px-4 py-6 sm:min-h-[480px] sm:px-8 sm:py-12">
        {children}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="ก่อนหน้า"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ink/40 p-2 text-paper transition hover:bg-ink/60"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="ถัดไป"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ink/40 p-2 text-paper transition hover:bg-ink/60"
          >
            →
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`สไลด์ที่ ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === active ? "w-6 bg-primary" : "w-2 bg-paper/60 hover:bg-paper/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
