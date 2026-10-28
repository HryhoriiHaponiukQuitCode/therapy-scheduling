import type { CSSProperties } from "react";
import { BrandMark } from "./brand-mark";
import { HoldsIcon, SuccessIcon, UsersIcon } from "./icons";

const POINTS = [
  { icon: HoldsIcon, text: "24-hour holds" },
  { icon: SuccessIcon, text: "Confirmed sessions" },
  { icon: UsersIcon, text: "Access by role" },
];

// Hero сторінки входу (DESIGN.md, розділ 6, «Вхід»): плями, що повільно дрейфують, лінія пульсу зі знака і велика назва,
// що тане донизу. Поява — по черзі (.rise, .reveal-line, затримка --d); при prefers-reduced-motion усе статичне.
export function LoginHero() {
  return (
    <section
      aria-label="About Practice scheduling"
      className="relative isolate flex min-h-[420px] flex-col justify-between gap-10 overflow-hidden rounded-xl border border-card-border bg-card p-8 shadow-glass max-[760px]:min-h-0 max-[760px]:gap-8 max-[760px]:rounded-lg max-[760px]:p-6"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <span className="hero-blob hero-blob-a left-[-10%] top-[-15%] size-[60%]" />
        <span className="hero-blob hero-blob-b right-[-15%] top-[20%] size-[55%]" />
        <span className="hero-blob hero-blob-c bottom-[-20%] left-[20%] size-[65%]" />
      </div>

      <div className="rise flex w-fit items-center gap-2.5 rounded-full border border-card-border bg-accent py-1.5 pr-4 pl-1.5 text-[13px] font-semibold">
        <BrandMark size={28} />
        Practice scheduling
      </div>

      <div className="flex max-w-[520px] flex-col gap-5">
        <p className="rise m-0 text-[28px] leading-9 tracking-[-0.02em] [--d:120ms] max-[760px]:text-[22px] max-[760px]:leading-7">
          Calm scheduling for a busy practice.
        </p>
        <p className="rise m-0 text-muted-foreground [--d:220ms]">
          Hold a slot for a client, confirm it as a session, and let every therapist see their week.
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {POINTS.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              className="rise flex items-center gap-2 rounded-full border border-card-border bg-accent px-3.5 py-2 text-[13px] font-semibold"
              style={{ "--d": `${320 + i * 80}ms` } as CSSProperties}
            >
              <Icon className="size-4 text-muted-foreground" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden className="-mb-[0.2em] flex flex-col gap-3 max-[760px]:hidden">
        <svg viewBox="0 0 600 80" preserveAspectRatio="none" fill="none" className="h-14 w-full">
          <path
            className="hero-pulse"
            pathLength={1}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            d="M0 40H400L414 40L426 8L442 72L456 24L466 40H600"
          />
        </svg>
        <p className="hero-wordmark m-0 text-[clamp(48px,7.2vw,112px)] leading-[0.92] tracking-[-0.05em]">
          <span className="block overflow-hidden">
            <span className="reveal-line block [--d:200ms]">Practice</span>
          </span>
          <span className="block overflow-hidden">
            <span className="reveal-line block [--d:320ms]">scheduling</span>
          </span>
        </p>
      </div>
    </section>
  );
}
