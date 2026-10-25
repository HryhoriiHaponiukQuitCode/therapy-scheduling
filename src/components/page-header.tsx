import type { ReactNode } from "react";

// Заголовок сторінки 44/52, 400, -0.025em (34/40 на телефоні) і опис muted-foreground (розділ 2.4).
// У сітці AppShell займає лише ліву колонку першого ряду: праворуч — пігулка акаунта.
export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="col-span-1! col-start-1 row-start-1 self-center">
      <h1 className="m-0 text-[44px] leading-[52px] font-normal tracking-[-0.025em] max-[760px]:text-[34px] max-[760px]:leading-10">
        {title}
      </h1>
      {description ? <p className="mt-0.5 mb-0 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
