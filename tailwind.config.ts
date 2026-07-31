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
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
