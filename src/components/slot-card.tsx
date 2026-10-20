import type { ReactNode } from "react";
import { StatusBadge, type BadgeStatus } from "./status-badge";

const TEXTURE: Record<BadgeStatus, string> = {
  Free: "slot-free",
  Held: "slot-held",
  Confirmed: "slot-confirmed",
  Expired: "slot-expired",
};

// Картка слота (розділ 2.3): фактура за статусом (пунктир / штриховка / суцільне / приглушене скло) + бейдж.
// Free — бейдж і дія; Held — імʼя, «Held until …», бейдж, дія; Confirmed — імʼя й бейдж. На телефоні дія під текстом.
export function SlotCard({
  status,
  name,
  detail,
  action,
  compact = false,
}: {
  status: BadgeStatus;
  name?: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-wrap items-start justify-between gap-x-4 gap-y-2.5 overflow-hidden rounded-lg ${
        compact ? "px-3.5 py-3" : "min-h-[86px] px-4 py-3.5"
      } ${TEXTURE[status]}`}
    >
      <div className="relative z-[1] flex min-w-0 flex-col gap-1">
        {name ? <span className="text-[15px] leading-5 font-semibold">{name}</span> : null}
        {detail ? <span className="text-[13px] text-muted">{detail}</span> : null}
        <StatusBadge status={status} />
      </div>
      {action ? <div className="relative z-[1] self-center max-[760px]:basis-full [&>button]:max-[760px]:w-full">{action}</div> : null}
    </div>
  );
}
