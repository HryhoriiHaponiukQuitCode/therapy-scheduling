import type { LabelHTMLAttributes } from "react";

// Підпис поля (DESIGN.md, розділ 5): 13/18, 600, над контролом; завжди з htmlFor.
export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-[13px] leading-[18px] font-semibold ${className}`} />;
}
