import { CheckIcon, ExpiredIcon, FreeIcon, HeldIcon } from "./icons";

export type BadgeStatus = "Free" | "Held" | "Confirmed" | "Expired";

const STYLE: Record<BadgeStatus, string> = {
  Free: "bg-status-free-bg text-status-free-fg",
  Held: "bg-status-held-bg text-status-held-fg",
  Confirmed: "bg-status-confirmed-bg text-status-confirmed-fg",
  Expired: "bg-status-expired-bg text-status-expired-fg",
};

const ICON = { Free: FreeIcon, Held: HeldIcon, Confirmed: CheckIcon, Expired: ExpiredIcon };

// Статус ніколи не лише кольором: текст PM + іконка + пастельний фон (розділ 1).
export function StatusBadge({ status }: { status: BadgeStatus }) {
  const Icon = ICON[status];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-xs leading-none font-medium ${STYLE[status]}`}
    >
      <Icon className="size-3" />
      {status}
    </span>
  );
}
