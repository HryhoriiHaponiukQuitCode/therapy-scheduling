import type { ReactNode } from "react";
import { Label } from "./label";

export { Input } from "./input";

// Поле (DESIGN.md, розділ 5): Label над контролом, звʼязаний через htmlFor (для Select — його тригер-кнопка);
// помилка поля — під ним, текстом destructive.
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
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
