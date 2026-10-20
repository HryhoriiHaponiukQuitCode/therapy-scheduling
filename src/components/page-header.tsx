import type { ReactNode } from "react";

// Заголовок сторінки 26/32, 600, -0.02em і опис muted (розділи 2.2, 3).
export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div>
      <h1 className="m-0 text-[26px] leading-8 font-semibold tracking-[-0.02em]">{title}</h1>
      {description ? <p className="mt-1 mb-0 text-muted">{description}</p> : null}
    </div>
  );
}
