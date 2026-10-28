import Link from "next/link";
import type { CSSProperties } from "react";
import { BrandMark } from "./brand-mark";
import { HoldsIcon, SuccessIcon, UsersIcon } from "./icons";
import { type BadgeStatus, StatusBadge } from "./ui/badge";
import { buttonClass } from "./ui/button";

const POINTS = [
  { icon: HoldsIcon, text: "24-hour holds" },
  { icon: SuccessIcon, text: "Confirmed sessions" },
  { icon: UsersIcon, text: "Access by role" },
];

// Приклад дня в hero: синтетичні дані, ті самі статуси й фактури, що в розкладі (SlotCard).
const PREVIEW: { time: string; name: string; status: BadgeStatus; note: string; texture: string }[] = [
  { time: "10:00", name: "Client One", status: "Confirmed", note: "Session", texture: "slot-confirmed" },
  { time: "11:00", name: "Client Seven", status: "Held", note: "Held until 14:43", texture: "slot-held" },
  { time: "12:00", name: "Free slot", status: "Free", note: "Therapist One", texture: "slot-free" },
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Hero лендінгу на весь екран, без рамки картки (DESIGN.md, розділ 6, «Лендінг»): плями, що повільно дрейфують, приклад дня, лінія пульсу зі знака
// і велика назва, що тане донизу. Поява — по черзі (.rise, .reveal-line, затримка --d); при prefers-reduced-motion
// усе статичне.
export function LandingHero() {
  return (
    <section
      aria-labelledby="landing-title"
      className="relative isolate flex min-h-dvh flex-col justify-between gap-12 overflow-hidden px-16 pt-10 max-[760px]:min-h-0 max-[760px]:gap-10 max-[760px]:px-6 max-[760px]:pt-6"
    >
      <div aria-hidden className="hero-blobs absolute inset-0 -z-10">
        <span className="hero-blob hero-blob-a top-[-15%] left-[-10%] size-[55%]" />
        <span className="hero-blob hero-blob-b top-[15%] right-[-12%] size-[50%]" />
        <span className="hero-blob hero-blob-c bottom-[-25%] left-[25%] size-[60%]" />
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

      <div className="flex items-center justify-between gap-10">
        <div className="flex max-w-[600px] flex-col gap-6">
          <h1
            id="landing-title"
            className="rise m-0 text-[52px] leading-[58px] font-normal tracking-[-0.03em] max-[760px]:text-[34px] max-[760px]:leading-10"
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

        <div aria-hidden className="float hidden w-[340px] shrink-0 flex-col gap-3 min-[1100px]:flex">
          {PREVIEW.map((slot, i) => (
            <div
              key={slot.time}
              className={`rise ${slot.texture} flex items-center gap-4 rounded-lg px-5 py-4`}
              style={delay(500 + i * 120)}
            >
              <span className="text-sm font-semibold text-muted-foreground">{slot.time}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm leading-5 font-semibold">{slot.name}</span>
                <span className="text-xs text-muted-foreground">{slot.note}</span>
              </span>
              <StatusBadge status={slot.status} />
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden className="-mb-[0.2em] flex flex-col gap-3">
        <svg
          viewBox="0 0 600 80"
          preserveAspectRatio="none"
          fill="none"
          className="hero-pulse h-14 w-full max-[760px]:h-10"
        >
          <path
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            d="M0 40H400L414 40L426 8L442 72L456 24L466 40H600"
          />
        </svg>
        <p className="hero-wordmark m-0 text-[clamp(44px,11vw,200px)] leading-[0.9] tracking-[-0.05em]">
          <span className="block overflow-hidden">
            <span className="reveal-line block" style={delay(200)}>
              Practice
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="reveal-line block" style={delay(320)}>
              scheduling
            </span>
          </span>
        </p>
      </div>
    </section>
  );
}
