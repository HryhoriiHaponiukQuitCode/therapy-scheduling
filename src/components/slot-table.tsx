import type { ReactNode } from "react";
import { StatusBadge, type BadgeStatus } from "./status-badge";

export type SlotTableRow = {
  key: string;
  time: string;
  status: BadgeStatus;
  client: string | null;
  heldUntil: string | null; // уже відформатоване «Held until …»
  action?: ReactNode;
};

const td = "h-[60px] border-b border-border px-3 py-2.5 align-middle max-[720px]:block max-[720px]:h-auto max-[720px]:border-0 max-[720px]:p-0";
const empty = <span className="text-muted max-[720px]:hidden">—</span>;

// Таблиця слотів (розділ 5): Time · Status · Client · Held until · дія. Порожні клітинки — «—» muted.
// До 720px рядок стає блоком: час зліва, праворуч статус, клієнт, «Held until …», кнопка.
export function SlotTable({
  rows,
  withAction = false,
  withHeader = true,
  withHeldUntil = true,
  label,
  "data-testid": testId,
}: {
  rows: SlotTableRow[];
  withAction?: boolean;
  withHeader?: boolean;
  withHeldUntil?: boolean; // false — для списку без колонки «Held until» (Expired holds)
  label?: string;
  "data-testid"?: string;
}) {
  return (
    <table className="w-full border-collapse max-[720px]:block" data-testid={testId} aria-label={label}>
      {withHeader ? (
        <thead className="max-[720px]:hidden">
          <tr>
            {["Time", "Status", "Client", ...(withHeldUntil ? ["Held until"] : [])].map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b border-border px-3 py-2.5 text-left text-xs leading-4 font-semibold whitespace-nowrap text-muted"
              >
                {h}
              </th>
            ))}
            {withAction ? (
              <th scope="col" className="border-b border-border px-3 py-2.5">
                <span className="sr-only">Action</span>
              </th>
            ) : null}
          </tr>
        </thead>
      ) : null}
      <tbody className="max-[720px]:block [&>tr:last-child>td]:border-b-0">
        {rows.map((row) => (
          <tr
            key={row.key}
            className="max-[720px]:grid max-[720px]:grid-cols-[minmax(64px,max-content)_1fr] max-[720px]:gap-x-3 max-[720px]:gap-y-1 max-[720px]:border-b max-[720px]:border-border max-[720px]:py-3.5 max-[720px]:last:border-b-0"
          >
            <td className={`${td} w-20 font-mono whitespace-nowrap text-[15px] leading-5 font-medium max-[720px]:row-span-4 max-[720px]:w-auto max-[720px]:pt-0.5`}>
              {row.time}
            </td>
            <td className={td}>
              <StatusBadge status={row.status} />
            </td>
            <td className={td}>{row.client ?? empty}</td>
            {withHeldUntil ? <td className={`${td} whitespace-nowrap text-muted`}>{row.heldUntil ?? empty}</td> : null}
            {withAction ? (
              <td className={`${td} w-[1%] text-right whitespace-nowrap max-[720px]:mt-1.5 max-[720px]:w-auto max-[720px]:text-left`}>
                {row.action}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
