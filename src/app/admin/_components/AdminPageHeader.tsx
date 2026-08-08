import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  eyebrow = 'Admin',
  title,
  description,
  backHref,
  backLabel = 'Back',
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-[var(--page-line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--page-muted)] transition-colors hover:text-[var(--page-text)]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : null}
        <p className="cac-kicker">{eyebrow}</p>
        <h1 className="mt-2 break-words font-[var(--font-display)] text-3xl font-bold tracking-[-0.04em] text-[var(--page-text)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--page-muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
