import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleX,
  Download,
  ExternalLink,
  Eye,
  Gift,
  Link2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Unlink,
  Upload,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export { ImageUploadField } from "./image-upload-field";
export { HeadingIcon, type HeadingIconName } from "./heading-icon";
export { Tabs } from "./tabs";

const buttonIcons = {
  add: Plus,
  back: ArrowLeft,
  chevronLeft: ChevronLeft,
  confirm: Check,
  connect: Link2,
  delete: Trash2,
  download: Download,
  down: ArrowDown,
  edit: Pencil,
  external: ExternalLink,
  gift: Gift,
  login: LogIn,
  logout: LogOut,
  next: ArrowRight,
  refresh: RefreshCw,
  reject: CircleX,
  save: Save,
  search: Search,
  send: Send,
  shield: ShieldCheck,
  success: CheckCircle2,
  unlink: Unlink,
  up: ArrowUp,
  upload: Upload,
  userCheck: UserCheck,
  userPlus: UserPlus,
  view: Eye,
} satisfies Record<string, LucideIcon>;

export type ButtonIconName = keyof typeof buttonIcons;

function ButtonIcon({ name }: { name?: ButtonIconName }) {
  if (!name) return null;
  const Icon = buttonIcons[name];
  return <Icon className="size-4 shrink-0" aria-hidden="true" />;
}

export function Button({
  className,
  variant = "primary",
  icon,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ink" | "ghost";
  icon?: ButtonIconName;
}) {
  const styles = {
    primary: "bg-primary text-ink hover:bg-primary-hover",
    ink: "bg-ink text-paper hover:bg-ink/90",
    ghost: "border border-lane bg-transparent hover:bg-lane/50",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl px-5 py-2 text-center text-sm font-semibold leading-snug transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    >
      <ButtonIcon name={icon} />
      {children}
    </button>
  );
}

export function LinkButton({
  className,
  variant = "primary",
  icon,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: "primary" | "ink" | "ghost";
  icon?: ButtonIconName;
}) {
  const styles = {
    primary: "bg-primary text-ink hover:bg-primary-hover",
    ink: "bg-ink text-paper hover:bg-ink/90",
    ghost: "border border-lane bg-transparent hover:bg-lane/50",
  }[variant];
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl px-5 py-2 text-center text-sm font-semibold leading-snug transition",
        styles,
        className,
      )}
      {...props}
    >
      <ButtonIcon name={icon} />
      {children}
    </Link>
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-lane bg-white p-4 shadow-[0_1px_2px_rgba(12,17,29,0.04)] sm:p-5",
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
        "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
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
        "h-11 min-w-0 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
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
        "min-w-0 w-full rounded-xl border border-lane bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
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
        "h-11 min-w-0 w-full rounded-xl border border-lane bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
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
