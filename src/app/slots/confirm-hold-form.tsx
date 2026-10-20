"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/action-message";
import { CONFIRM_FORM_ID } from "@/lib/holds";
import { confirmHold, type ConfirmHoldState } from "./actions";

const initialState: ConfirmHoldState = { status: "idle" };

// Одна форма підтвердження на сторінку: кнопки Confirm у рядках утриманих слотів надсилають її через атрибут form
// і передають hold_id як значення кнопки (AC-HOLD-12). Форма лишається змонтованою — результат видно й оголошено.
export function ConfirmHoldForm() {
  const [state, formAction, pending] = useActionState(confirmHold, initialState);

  return (
    <form id={CONFIRM_FORM_ID} action={formAction} className="flex flex-col gap-1" aria-busy={pending}>
      {pending ? <p className="m-0 text-sm text-muted">Confirming…</p> : null}
      <ActionMessage state={state} />
    </form>
  );
}
