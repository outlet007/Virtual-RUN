function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

// สีธีมแก้ผ่านหน้าเว็บได้แค่สี "หลัก" (ink/primary/accent/medal) — เฉด dark/soft ที่เหลือ
// (primary.dark, primary.soft, medal.soft) ไล่เฉดเองจากสีหลักแทนให้ admin กรอกทีละสี
export function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
