'use client';

import type { ReactNode } from 'react';

type AdminConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  tone?: 'danger' | 'warning';
};

export function AdminConfirmDialog({
  title,
  children,
  confirmLabel,
  onCancel,
  onConfirm,
  busy = false,
  tone = 'danger',
}: AdminConfirmDialogProps) {
  const confirmClass = tone === 'danger'
    ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
    : 'border-amber-500 bg-amber-500 text-black hover:bg-amber-400';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        aria-describedby="admin-confirm-description"
        aria-labelledby="admin-confirm-title"
        aria-modal="true"
        className="cac-panel w-full max-w-md p-6 shadow-2xl"
        role="alertdialog"
      >
        <h2 id="admin-confirm-title" className="font-[var(--font-display)] text-xl font-bold">
          {title}
        </h2>
        <div id="admin-confirm-description" className="mt-3 text-sm leading-6 text-[var(--page-muted)]">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="cac-button-secondary" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`inline-flex min-h-11 items-center justify-center border px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
