import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HoldsIcon, ScheduleIcon, SlotsIcon } from "@/components/icons";
import { LandingHero } from "@/components/landing-hero";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Practice scheduling",
  description: "Calm scheduling for a busy practice: hold a slot for a client, confirm it as a session.",
};

const STATEMENT =
  "A scheduler finds a free slot, holds it for the client for 24 hours, and confirms it as a session once the client agrees. Nobody else can take that time in between.";

const STEPS = [
  { icon: SlotsIcon, title: "Find a free slot", text: "Pick a therapist and a day. Free, held and confirmed slots are marked with text and icons." },
  { icon: HoldsIcon, title: "Hold it for 24 hours", text: "The slot is kept for the client, so no one else can book that time." },
  { icon: ScheduleIcon, title: "Confirm the session", text: "When the client agrees, the hold becomes a session in the therapist's week." },
];

const ROLES = [
  { title: "Scheduler", text: "Creates client cards from intake forms, holds therapist slots and confirms them." },
  { title: "Therapist", text: "Sees their own week, Monday to Sunday, and the cards of their own clients." },
  { title: "Admin", text: "Runs the practice and can do everything a scheduler can." },
];

// Лендінг для гостя — одна суцільна сторінка, секції без карток, поділені лінією (DESIGN.md, розділ 6, «Лендінг»): гість на «/» бачить цю сторінку за тією самою адресою
// (src/lib/guest-route.ts), вхід — кнопкою «Sign in». Даних застосунку немає: сторінка статична.
// Секції нижче з'являються під час прокрутки (.scroll-rise), слова тези темнішають по одному (.scroll-word).
export default function WelcomePage() {
  const words = STATEMENT.split(" ");
  return (
    <div className="flex w-full flex-1 flex-col">
      <LandingHero />

      <main className="flex flex-col">
        <section
          id="how"
          aria-labelledby="how-title"
          className="flex flex-col gap-14 border-t border-border px-10 py-24 max-[760px]:px-5 max-[760px]:py-14"
        >
          <div className="grid gap-8 min-[1024px]:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
            <h2 id="how-title" className="scroll-rise m-0 text-[13px] leading-[18px] font-semibold text-muted-foreground">
              How it works
            </h2>
            <p className="statement m-0 text-[34px] leading-[44px] tracking-[-0.02em] max-[760px]:text-[24px] max-[760px]:leading-8">
              {words.map((word, i) => (
                <span
                  key={i}
                  className="scroll-word"
                  style={{ "--from": `${(i / words.length) * 45}%`, "--to": `${((i + 1) / words.length) * 45 + 5}%` } as CSSProperties}
                >
                  {word}{" "}
                </span>
              ))}
            </p>
          </div>
          <ol className="m-0 grid list-none gap-8 p-0 min-[900px]:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="scroll-rise flex flex-col gap-3 border-t border-border pt-6">
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full border border-card-border bg-card">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="text-[13px] font-semibold text-muted-foreground">0{i + 1}</span>
                </span>
                <h3 className="m-0 text-lg leading-6 font-semibold">{title}</h3>
                <p className="m-0 text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="roles-title"
          className="flex flex-col gap-10 border-t border-border px-10 py-24 max-[760px]:px-5 max-[760px]:py-14"
        >
          <h2
            id="roles-title"
            className="scroll-rise m-0 text-[34px] leading-10 font-normal tracking-[-0.02em] max-[760px]:text-[24px] max-[760px]:leading-8"
          >
            One place, three roles.
          </h2>
          <ul className="m-0 grid list-none gap-8 p-0 min-[900px]:grid-cols-3">
            {ROLES.map(({ title, text }) => (
              <li key={title} className="scroll-rise flex flex-col gap-2 border-t border-border pt-5">
                <h3 className="m-0 text-lg leading-6 font-semibold">{title}</h3>
                <p className="m-0 text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="cta-title"
          className="scroll-rise flex flex-col items-center gap-6 text-center border-t border-border px-10 py-24 max-[760px]:px-5 max-[760px]:py-14"
        >
          <h2
            id="cta-title"
            className="m-0 text-[34px] leading-10 font-normal tracking-[-0.02em] max-[760px]:text-[24px] max-[760px]:leading-8"
          >
            Ready for today&apos;s schedule?
          </h2>
          <Link href="/login" className={buttonClass("primary")}>
            Sign in
          </Link>
        </section>
      </main>

      <footer className="border-t border-border px-10 py-6 text-xs text-muted-foreground max-[760px]:px-5">
        Practice scheduling — an internal tool for one therapy practice.
      </footer>
    </div>
  );
}
