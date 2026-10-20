import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ink/primary/accent/medal ผูกกับ CSS variable ที่ฉีดจาก system_settings ใน root layout
        // (app/layout.tsx) — admin แก้สีธีมผ่านหน้า /admin/settings แล้วมีผลทันทีทั้งระบบ
        // ไม่ต้อง build ใหม่ ดู lib/color.ts สำหรับการไล่เฉด dark/soft จากสีหลัก
        ink: "var(--color-ink)",
        paper: "#FAFAF8",
        primary: {
          DEFAULT: "var(--color-primary)", // go / distance
          // ปุ่ม primary ใช้ text-ink ทับเสมอ (ดู components/ui/index.tsx) เพราะสีพื้นอาจสว่าง
          dark: "var(--color-primary-dark)",
          hover: "var(--color-primary-hover)",
          soft: "var(--color-primary-soft)",
        },
        medal: {
          DEFAULT: "var(--color-medal)", // achievements
          soft: "var(--color-medal-soft)",
        },
        lane: "#E7E5DF", // track lane lines
        muted: "#585858", // ตัวหนังสือรอง/จาง — แทน text-ink/60 เดิม (คงที่ ไม่ผูกกับสี ink)
        accent: "var(--color-accent)", // ตัวหนังสือวันที่/สถิติย่อยบนการ์ด — แทน text-ink/45 เดิม
        charcoal: "#414141", // ชื่อแพ็กเกจ
      },
      fontFamily: {
        // font เดียวทั้งระบบ — Noto Sans Thai (ดู app/layout.tsx)
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      // ขนาดตัวอักษรเล็กปรับให้อ่านภาษาไทยง่ายขึ้น (เดิม xs 12px, sm 14px)
      // line-height ขยายตามสัดส่วนเดิม ไม่ให้สระบน/ล่างของภาษาไทยชนกัน
      fontSize: {
        xs: ["14px", { lineHeight: "1.25rem" }],
        sm: ["15px", { lineHeight: "1.375rem" }],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      // เนื้อหา rich text แบบ prose-sm (เดิม 14px)
      typography: {
        sm: {
          css: {
            fontSize: "16px",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
