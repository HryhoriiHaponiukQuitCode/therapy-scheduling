import { CheckIcon, ExpiredIcon, FreeIcon, HeldIcon } from "../icons";

export type BadgeStatus = "Free" | "Held" | "Confirmed" | "Expired";

const STYLE: Record<BadgeStatus, string> = {
  Free: "bg-status-free text-status-free-foreground",
  Held: "bg-status-held text-status-held-foreground",
  Confirmed: "bg-status-confirmed text-status-confirmed-foreground",
  Expired: "bg-status-expired text-status-expired-foreground",
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
