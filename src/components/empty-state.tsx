import type { HTMLAttributes, ReactNode } from "react";
import { CalendarIcon } from "./icons";

// Порожній стан (розділ 4): пунктирна рамка радіуса 24px, іконка в скляному колі 56px (primary), текст 600.
// role і data-testid передаються як є.
export function EmptyState({
  icon,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { icon?: ReactNode; "data-testid"?: string }) {
  return (
    <div
      {...props}
      className="flex flex-col items-center gap-3 rounded-lg border-[1.5px] border-dashed border-input px-4 py-9 text-center"
    >
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full border border-card-border bg-accent text-primary [&>svg]:size-6"
      >
        {icon ?? <CalendarIcon />}
      </span>
      <p className="m-0 font-semibold">{children}</p>
    </div>
  );
}
