import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { STAFF_ONLY_PAGE_MESSAGE, STAFF_ROLES } from "@/lib/roles";
import { formatPracticeTime } from "@/lib/slots";
import { CONFIRM_FORM_ID } from "@/lib/holds";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { EmptyState } from "@/components/empty-state";
import { HoldsIcon } from "@/components/icons";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ConfirmHoldForm } from "../slots/confirm-hold-form";
import { loadHolds } from "./data";

// Список утримань планувальника й адміністратора: «Held» і «Expired» слотів, що ще не почалися, за часом слоту
// (AC-HOLD-20, 28, 29, 37, 38, 42, 43); «Held» можна підтвердити (AC-HOLD-27, AC-HOLD-36). Терапевт бачить лише
// відмову (AC-HOLD-44). Фактура рядка — як у картки слота (DESIGN.md, розділ 2): штриховка «Held», приглушене «Expired».
export default async function HoldsPage() {
  const access = await getPageAccess(STAFF_ROLES, STAFF_ONLY_PAGE_MESSAGE);
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="Holds" message={access.message} />;

  const supabase = await createClient();
  const { holds, error } = await loadHolds(supabase, new Date());

  return (
    <>
      <PageHeader title="Holds" description="Held and expired holds of upcoming slots. Times in America/Los_Angeles." />
      <Panel id="holds-list" title="Upcoming holds" className="max-w-[880px]">
        {error ? (
          <ActionMessage state={{ status: "error", message: "Could not load holds. Try again later." }} />
        ) : (
          <div className="flex flex-col gap-4">
            <ConfirmHoldForm />
            {holds.length === 0 ? (
              // Власне формулювання: PM тексту для порожнього списку не задав.
              <EmptyState icon={<HoldsIcon />} data-testid="no-holds">
                No holds.
              </EmptyState>
            ) : (
              <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0" data-testid="holds" aria-label="Holds">
                {holds.map((hold) => (
                  <li
                    key={hold.id}
                    className={`${hold.status === "Held" ? "slot-held" : "slot-expired"} flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-lg px-3.5 py-3`}
                  >
                    <b className="font-semibold">{formatPracticeTime(hold.slotStart)}</b>
                    <span>{hold.clientName}</span>
                    <span className="text-muted-foreground">{hold.therapistName}</span>
                    <StatusBadge status={hold.status} />
                    {hold.status === "Held" ? (
                      <>
                        <span className="text-xs text-muted-foreground">Held until {formatPracticeTime(hold.heldUntil)}</span>
                        <Button
                          type="submit"
                          variant="secondary"
                          form={CONFIRM_FORM_ID}
                          name="hold_id"
                          value={`${hold.id}|${hold.slotStart.toISOString()}`}
                          aria-label={`Confirm ${formatPracticeTime(hold.slotStart)}, ${hold.clientName}`}
                          className="ml-auto"
                        >
                          Confirm
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
