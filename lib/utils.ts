import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKm(km: number) {
  return km.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatBaht(amount: number) {
  return amount.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  });
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function genBib() {
  return "VR" + Math.floor(100000 + Math.random() * 900000).toString();
}
