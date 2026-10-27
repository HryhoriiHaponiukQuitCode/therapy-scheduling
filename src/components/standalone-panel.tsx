import type { ReactNode } from "react";
import { BrandMark } from "./icons";

// Окрема скляна панель 400px по центру, без смуги (DESIGN.md, розділ 5): вхід (/login) і екран без доступу (NoAccess).
export function StandalonePanel({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full flex-1 items-center justify-center px-4 py-16">
      <section
        aria-labelledby={labelledBy}
        className="glass flex w-full max-w-[400px] flex-col gap-6 rounded-xl p-8 max-[760px]:rounded-lg max-[760px]:p-6"
      >
        <div className="flex items-center gap-3 text-[15px] font-semibold tracking-[-0.01em]">
          <BrandMark size={40} />
          Practice scheduling
        </div>
        {children}
      </section>
    </main>
  );
}
