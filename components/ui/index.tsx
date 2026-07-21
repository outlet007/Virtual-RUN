import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ink" | "ghost";
}) {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-dark",
    ink: "bg-ink text-paper hover:bg-ink/90",
    ghost: "border border-lane bg-transparent hover:bg-lane/50",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: "primary" | "ink" | "ghost" }) {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-dark",
    ink: "bg-ink text-paper hover:bg-ink/90",
    ghost: "border border-lane bg-transparent hover:bg-lane/50",
  }[variant];
  return (
    <Link
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-lane bg-white p-5 shadow-[0_1px_2px_rgba(12,17,29,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-lane bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-ink/70", className)}
      {...props}
    />
  );
}

export function TrackProgress({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div>
      <div className="track-lane">
        <div className="track-lane__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-xs text-ink/50">
        <span className="tnum">{pct}%</span>
        <span className="tnum">เป้า {target} km</span>
      </div>
    </div>
  );
}
