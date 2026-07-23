import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200/70 bg-white shadow-card",
        className
      )}
      {...props}
    />
  );
}

type SectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

// Tarjeta con encabezado usada por las secciones del Portal.
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: SectionProps) {
  return (
    <Card className={cn("p-6 md:p-7", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink-900">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-ink-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
}
