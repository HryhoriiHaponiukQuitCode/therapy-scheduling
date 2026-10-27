import type { ReactNode } from "react";

// Скляна панель (розділ 4): радіус 28px (24px на телефоні), padding 26px (20px); <section aria-labelledby>.
// Заголовок 22/28, 500; опис muted-foreground; дії праворуч. labelledBy — коли заголовок рендерить дитина (форма утримання).
export function Panel({
  id,
  title,
  description,
  actions,
  labelledBy,
  className = "",
  children,
}: {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  labelledBy?: string;
  className?: string;
  children?: ReactNode;
}) {
  const headingId = title && id ? id : undefined;
  return (
    <section
      aria-labelledby={headingId ?? labelledBy}
      className={`glass min-w-0 rounded-xl p-[26px] max-[760px]:rounded-lg max-[760px]:p-5 ${className}`}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          {title ? (
            <div className="min-w-0">
              <h2 id={headingId} className="m-0 text-[22px] leading-7 font-medium tracking-[-0.01em]">
                {title}
              </h2>
              {description ? <p className="mt-1.5 mb-0 text-muted-foreground">{description}</p> : null}
            </div>
          ) : null}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
