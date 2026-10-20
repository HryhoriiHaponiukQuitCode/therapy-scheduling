import type { InputHTMLAttributes, ReactNode } from "react";

// Поле: підпис 13/18, 600, звʼязаний з контролом через htmlFor (для Select і DatePicker — їхній тригер-кнопка).
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

export const controlClass =
  "flex min-h-11 w-full items-center gap-2.5 rounded-md border border-border-strong bg-surface px-3 text-left text-sm text-ink aria-invalid:border-error";

// Текстове поле: межа border-strong, 44px, aria-invalid → межа error (розділ 4).
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}
