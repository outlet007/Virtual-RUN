import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C111D",
        paper: "#FAFAF8",
        primary: {
          DEFAULT: "#12B76A", // go / distance
          dark: "#0B7A47",
          soft: "#E7F8EF",
        },
        medal: {
          DEFAULT: "#F5A524", // achievements
          soft: "#FDF4E3",
        },
        lane: "#E7E5DF", // track lane lines
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
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
