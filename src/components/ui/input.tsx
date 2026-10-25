import type { InputHTMLAttributes } from "react";

// Контрол-пігулка 48px (DESIGN.md, розділ 5): тло accent, межа input, aria-invalid → межа destructive.
// controlClass бере й тригер Select, щоб поле й список виглядали однаково.
export const controlClass =
  "flex min-h-12 w-full items-center gap-2.5 rounded-full border border-input bg-accent px-[18px] text-left text-sm font-medium text-foreground aria-invalid:border-destructive";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}
