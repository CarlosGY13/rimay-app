import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const VARIANTES: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-soft hover:bg-brand-700 focus-visible:ring-brand-200 active:bg-brand-700",
  secondary:
    "bg-white text-ink-700 ring-1 ring-inset ring-ink-200 shadow-soft hover:bg-ink-50 focus-visible:ring-brand-200",
  ghost:
    "text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-ink-200",
  danger:
    "bg-white text-red-600 ring-1 ring-inset ring-red-100 hover:bg-red-50 focus-visible:ring-red-200",
};

const TAMANOS: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-4",
          "disabled:pointer-events-none disabled:opacity-50",
          VARIANTES[variant],
          TAMANOS[size],
          className
        )}
        {...props}
      />
    );
  }
);
