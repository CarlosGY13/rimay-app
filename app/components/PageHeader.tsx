import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

// Encabezado consistente para las páginas internas.
export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
