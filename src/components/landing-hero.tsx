import Link from "next/link";
import type { CSSProperties } from "react";
import { BrandMark } from "./brand-mark";
import { HoldsIcon, SuccessIcon, UsersIcon } from "./icons";
import { LandingPill } from "./landing-pill";
import { buttonClass } from "./ui/button";

const POINTS = [
  { icon: HoldsIcon, text: "24-hour holds" },
  { icon: SuccessIcon, text: "Confirmed sessions" },
  { icon: UsersIcon, text: "Access by role" },
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Hero лендінгу на один екран, без рамки картки (DESIGN.md, розділ 6, «Лендінг»): плями, що повільно дрейфують,
// текст угорі ліворуч, 3D-капсула на всю праву частину (LandingPill, від 1100px) і велика назва, що тане
// донизу й зменшується на низьких екранах (22dvh), щоб її було видно повністю. Поява — по черзі (.rise, .reveal-line,
// затримка --d); при prefers-reduced-motion усе статичне.
export function LandingHero() {
  return (
    <section
      aria-labelledby="landing-title"
      className="relative isolate flex min-h-dvh flex-col justify-between gap-12 overflow-hidden px-16 pt-10 pb-8 max-[760px]:min-h-0 max-[760px]:gap-10 max-[760px]:px-6 max-[760px]:pt-6"
    >
      <div aria-hidden className="hero-blobs absolute inset-0 -z-10">
        <span className="hero-blob hero-blob-a top-[-15%] left-[-10%] size-[55%]" />
        <span className="hero-blob hero-blob-b top-[15%] right-[-12%] size-[50%]" />
        <span className="hero-blob hero-blob-c bottom-[-25%] left-[25%] size-[60%]" />
      </div>

      {/* Капсула — на всю праву частину hero, від шапки до низу: не перекриває текст ліворуч (до 800px) і «Sign in». */}
      <div
        aria-hidden
        className="absolute top-28 right-0 bottom-0 hidden w-[min(50%,calc(100%-800px))] min-[1100px]:block"
      >
        <LandingPill />
      </div>

      <header className="rise flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 rounded-full border border-card-border bg-accent py-1.5 pr-4 pl-1.5 text-[13px] font-semibold">
          <BrandMark size={28} />
          Practice scheduling
        </div>
        <Link href="/login" className={buttonClass("primary")}>
          Sign in
        </Link>
      </header>

      <div className="flex flex-1 items-start">
        <div className="flex max-w-[600px] flex-col gap-6 min-[1100px]:pt-[4dvh] min-[1600px]:max-w-[720px]">
          <h1
            id="landing-title"
            className="rise m-0 text-[52px] leading-[58px] font-normal tracking-[-0.03em] max-[760px]:text-[34px] max-[760px]:leading-10 min-[1600px]:text-[64px] min-[1600px]:leading-[70px]"
            style={delay(120)}
          >
            Calm scheduling for a busy practice.
          </h1>
          <p className="rise m-0 max-w-[480px] text-base leading-6 text-muted-foreground" style={delay(220)}>
            Hold a slot for a client, confirm it as a session, and let every therapist see their week.
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {POINTS.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="rise flex items-center gap-2 rounded-full border border-card-border bg-accent px-3.5 py-2 text-[13px] font-semibold"
                style={delay(320 + i * 80)}
              >
                <Icon className="size-4 text-muted-foreground" />
                {text}
              </li>
            ))}
          </ul>
        </div>

      </div>

      <p
        aria-hidden
        className="hero-wordmark text-[clamp(44px,min(11vw,22dvh),260px)] leading-[0.9] tracking-[-0.05em]"
      >
        <span className="block overflow-hidden">
          <span className="reveal-line block" style={delay(200)}>
            Practice
          </span>
        </span>
        <span className="block overflow-hidden pb-[0.15em]">
          <span className="reveal-line block" style={delay(320)}>
            scheduling
          </span>
        </span>
      </p>
    </section>
  );
}
