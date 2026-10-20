import type { HTMLAttributes, ReactNode } from "react";
import { CalendarIcon } from "./icons";

// Порожній стан (розділ 4): пунктирна рамка border-strong, іконка, текст. role і data-testid передаються як є.
export function EmptyState({
  icon,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { icon?: ReactNode; "data-testid"?: string }) {
  return (
    <div
      {...props}
      className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-border-strong px-4 py-8 text-center"
    >
      <span className="text-muted [&>svg]:size-7">{icon ?? <CalendarIcon />}</span>
      <p className="m-0 font-semibold">{children}</p>
    </div>
  );
}
