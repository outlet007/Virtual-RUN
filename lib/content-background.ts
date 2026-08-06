import type { ContentBackgroundDisplay } from "@/lib/system-settings";

export function getContentBackgroundDisplayStyle(mode: ContentBackgroundDisplay) {
  switch (mode) {
    case "contain":
      return { backgroundSize: "contain", backgroundRepeat: "no-repeat" } as const;
    case "stretch":
      return { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" } as const;
    case "auto":
      return { backgroundSize: "auto", backgroundRepeat: "no-repeat" } as const;
    case "repeat":
      return { backgroundSize: "auto", backgroundRepeat: "repeat" } as const;
    case "repeat-x":
      return { backgroundSize: "auto", backgroundRepeat: "repeat-x" } as const;
    case "repeat-y":
      return { backgroundSize: "auto", backgroundRepeat: "repeat-y" } as const;
    case "cover":
    default:
      return { backgroundSize: "cover", backgroundRepeat: "no-repeat" } as const;
  }
}

export function getContentBackgroundInsetStyle(top: number, bottom: number) {
  return { top: `${top}px`, bottom: `${bottom}px` } as const;
}
