import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2C3B98",
        paper: "#FAFAF8",
        primary: {
          DEFAULT: "#FEC81D", // go / distance
          // #FEC81D สว่างมาก ปุ่ม primary เดิมใช้ text-white ทับ (bg-primary text-white)
          // อ่านไม่ออก — ต้องเปลี่ยนตัวหนังสือบนปุ่มเป็น text-ink แทนทุกจุด (ดู components/ui/index.tsx)
          dark: "#D9AB0A", // เข้มกว่าเดิมสำหรับ hover
          soft: "#FFF6D9",
        },
        medal: {
          DEFAULT: "#F5A524", // achievements
          soft: "#FDF4E3",
        },
        lane: "#E7E5DF", // track lane lines
        muted: "#585858", // ตัวหนังสือรอง/จาง — แทน text-ink/60 เดิม (คงที่ ไม่ผูกกับสี ink)
        accent: "#FF4A00", // ตัวหนังสือวันที่/สถิติย่อยบนการ์ด — แทน text-ink/45 เดิม
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
  plugins: [],
};

export default config;
