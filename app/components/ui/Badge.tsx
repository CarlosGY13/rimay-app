import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONOS: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-600 ring-ink-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
};

type BadgeProps = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        TONOS[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
