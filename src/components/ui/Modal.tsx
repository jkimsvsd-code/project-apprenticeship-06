"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>(
        'input:not([type="checkbox"]), textarea, select',
      )
      ?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <p className="eyebrow">MY DIARY</p>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="닫기"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function FormError({
  error,
}: {
  error: { message: string; field?: string } | null;
}) {
  useEffect(() => {
    if (error) {
      const el = document.querySelector<HTMLFormElement>("dialog[open] form");
      const field = error.field && el?.elements.namedItem(error.field);
      if (field instanceof HTMLElement) field.focus();
      else el?.querySelector<HTMLElement>('[role="alert"]')?.focus();
    }
  }, [error]);
  return error ? (
    <p className="form-error" role="alert" tabIndex={-1}>
      {error.message}
    </p>
  ) : null;
}
