import type { ReactNode } from "react";

// Картка (розділ 4): <section aria-labelledby>, заголовок 16/22 з іконкою, необовʼязкові дії праворуч.
export function Card({
  id,
  title,
  icon,
  actions,
  headingLevel = 2,
  className = "",
  children,
}: {
  id?: string;
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2;
  className?: string;
  children: ReactNode;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const headingId = title && id ? id : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-lg border border-border bg-surface p-7 shadow-card max-[720px]:p-5 ${className}`}
    >
      {title || actions ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title ? (
            <Heading
              id={headingId}
              className="m-0 flex items-center gap-2.5 text-base leading-[22px] font-semibold tracking-[-0.01em]"
            >
              {icon ? <span className="flex size-[18px] flex-none [&>svg]:size-[18px]">{icon}</span> : null}
              {title}
            </Heading>
          ) : null}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
