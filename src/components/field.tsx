import type { InputHTMLAttributes, ReactNode } from "react";

// Поле (розділ 4): підпис 13/18, 600 над контролом, звʼязаний через htmlFor (для Select — його тригер-кнопка).
export function Field({
  label,
  htmlFor,
  error,
  className = "",
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] leading-[18px] font-semibold">
        {label}
      </label>
      {children}
      {error ? <p className="m-0 text-xs text-error">{error}</p> : null}
    </div>
  );
}

// Контрол-пігулка 48px: glass-hi, межа border-strong, aria-invalid → межа error.
export const controlClass =
  "flex min-h-12 w-full items-center gap-2.5 rounded-full border border-border-strong bg-glass-hi px-[18px] text-left text-sm font-medium text-ink aria-invalid:border-error";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}
