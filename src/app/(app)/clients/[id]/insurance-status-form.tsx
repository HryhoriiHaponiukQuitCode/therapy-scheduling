"use client";

import { useActionState, useState } from "react";
import { ActionMessage, type ActionResult } from "@/components/action-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  INSURANCE_CHOOSE_MESSAGE,
  INSURANCE_FIELD,
  INSURANCE_STATUSES,
  parseInsuranceStatus,
  SETTABLE_INSURANCE_STATUSES,
} from "@/lib/insurance";
import { setInsuranceStatus } from "./actions";

const initialState: ActionResult = { status: "idle" };

// «Not set» у списку немає: повернути його не можна (вимога «Позначення статусу…»).
const OPTIONS = SETTABLE_INSURANCE_STATUSES.map((value) => ({ value, label: INSURANCE_STATUSES[value] }));

// Форма статусу страхування в картці (AC-INS-02, AC-INS-03). Сторінка показує її лише admin і scheduler (AC-INS-04);
// захист — дія setInsuranceStatus і RLS. Поки статус не вибрано (картка з «Not set»), «Save» вимкнена, причина —
// поруч (DESIGN.md, 6a).
export function InsuranceStatusForm({ clientId, status }: { clientId: string; status: string }) {
  const [state, formAction, pending] = useActionState(setInsuranceStatus.bind(null, clientId), initialState);
  const [chosen, setChosen] = useState(parseInsuranceStatus(status) ?? "");
  // Картка оновилась (наше збереження чи зміна іншого працівника) — вибір іде за новим статусом, інакше «Save»
  // записав би старий вибір поверх чужої зміни. Форму не перемонтовуємо: це скинуло б «Insurance status saved.»
  // (useActionState); перемонтовуємо лише Select (key), бо його значення — внутрішній стан з defaultValue.
  const [shownStatus, setShownStatus] = useState(status);
  if (status !== shownStatus) {
    setShownStatus(status);
    setChosen(parseInsuranceStatus(status) ?? "");
  }

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3" data-testid="insurance-form">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Insurance status" htmlFor="insurance-status-select" className="min-w-0 flex-[0_1_260px]">
          <Select
            key={status}
            id="insurance-status-select"
            name={INSURANCE_FIELD}
            options={OPTIONS}
            defaultValue={chosen}
            placeholder="Choose a status"
            onChange={setChosen}
            avatars={false}
          />
        </Field>
        <Button type="submit" variant="primary" pending={pending} disabled={!chosen}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {!chosen ? (
        <p className="m-0 text-sm text-muted-foreground" data-testid="insurance-hint">
          {INSURANCE_CHOOSE_MESSAGE}
        </p>
      ) : null}
      <ActionMessage state={state} />
    </form>
  );
}
