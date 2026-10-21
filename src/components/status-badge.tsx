import { CheckIcon, ExpiredIcon, FreeIcon, HeldIcon } from "./icons";

export type BadgeStatus = "Free" | "Held" | "Confirmed" | "Expired";

const STYLE: Record<BadgeStatus, string> = {
  Free: "bg-free-bg text-free-fg",
  Held: "bg-held-bg text-held-fg",
  Confirmed: "bg-confirmed-bg text-confirmed-fg",
  Expired: "bg-expired-bg text-expired-fg",
};

const ICON = { Free: FreeIcon, Held: HeldIcon, Confirmed: CheckIcon, Expired: ExpiredIcon };

// Бейдж-пігулка (розділ 2.3): текст PM + іконка; разом із фактурою картки статус ніколи не лише кольором.
export function StatusBadge({ status }: { status: BadgeStatus }) {
  const Icon = ICON[status];
  return (
    <span
      className={`inline-flex h-6 w-fit items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs leading-none font-bold ${STYLE[status]}`}
    >
      <Icon className="size-3" />
      {status}
    </span>
  );
}
