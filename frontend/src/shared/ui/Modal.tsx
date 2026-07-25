import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { useUiStore } from '@/shared/state/uiStore';

type Props = PropsWithChildren<{
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  className?: string;
}>;

export function Modal({ open, title, description, onClose, footer, className, children }: Props) {
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const focusFirstElement = () => {
    const el = dialogRef.current;
    if (!el) return;

    const auto = el.querySelector<HTMLElement>('[data-autofocus]');
    if (auto && typeof auto.focus === 'function') {
      auto.focus();
      return;
    }

    const focusables = Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => {
      // Skip elements that are not actually visible.
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    const first = focusables[0];
    if (first && typeof first.focus === 'function') {
      first.focus();
      return;
    }

    // Fallback: focus the dialog itself.
    el.focus();
  };

  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const el = dialogRef.current;
    if (!el) return;

    const focusables = Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => {
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (focusables.length === 0) return;

    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (!active || active === first || !el.contains(active)) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (!active || active === last || !el.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      trapFocus(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    // Let the dialog render, then focus inside.
    const id = window.setTimeout(() => focusFirstElement(), 0);
    return () => {
      window.clearTimeout(id);
      lastFocusedRef.current?.focus?.();
      lastFocusedRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;

    // Prevent the background (dashboard) from scrolling while the modal is open.
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [open]);

  if (!open) return null;

  const dialogBase = isDay
    ? 'bg-white text-slate-900 ring-slate-200'
    : 'bg-slate-950 text-slate-50 ring-white/10';

  const descriptionClass = isDay ? 'text-slate-600' : 'text-slate-300';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-4 shadow-xl ring-1',
            dialogBase,
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                {title ? (
                  <div id={titleId} className="text-base font-semibold">
                    {title}
                  </div>
                ) : null}
                {description ? (
                  <div id={descriptionId} className={cn('text-sm', descriptionClass)}>
                    {description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar"
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg text-lg leading-none ring-1 transition',
                  isDay
                    ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                    : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10',
                )}
              >
                ×
              </button>
            </div>
          )}

          <div>{children}</div>

          {footer ? <div className="mt-4 flex items-center justify-end gap-2">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
