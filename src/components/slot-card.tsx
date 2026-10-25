import type { ReactNode } from "react";
import { StatusBadge, type BadgeStatus } from "./ui/badge";

const TEXTURE: Record<BadgeStatus, string> = {
  Free: "slot-free",
  Held: "slot-held",
  Confirmed: "slot-confirmed",
  Expired: "slot-expired",
};

// Картка слота (розділ 2.3): фактура за статусом (пунктир / штриховка / суцільне / приглушене скло), імʼя клієнта
// 600, «Held until …» muted-foreground, бейдж статусу; унизу проміжок часу «09:00 – 10:00»; дія — під ним на всю ширину картки.
export function SlotCard({
  status,
  name,
  detail,
  range,
  action,
}: {
  status: BadgeStatus;
  name?: ReactNode;
  detail?: ReactNode;
  range: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={`relative flex h-full min-h-[108px] flex-col justify-between gap-2.5 overflow-hidden rounded-lg px-3.5 py-3 ${TEXTURE[status]}`}
    >
      <div className="relative z-[1] flex min-w-0 flex-col items-start gap-1">
        {name ? <span className="max-w-full truncate text-sm leading-5 font-semibold">{name}</span> : null}
        {detail ? <span className="text-xs leading-4 text-muted-foreground">{detail}</span> : null}
        <StatusBadge status={status} />
      </div>
      <span className="relative z-[1] text-xs leading-4 font-medium text-muted-foreground">{range}</span>
      {action ? <div className="relative z-[1] [&>button]:w-full">{action}</div> : null}
    </div>
  );
}
