"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/action-message";
import { HOLD_FORM_ID } from "@/lib/holds";
import { holdSlot, type HoldSlotState } from "./actions";
import type { ClientOption } from "./data";

const initialState: HoldSlotState = { status: "idle" };

// Одна форма утримання на сторінку: клієнт вибирається один раз, а кнопки Hold у рядках вільних слотів
// надсилають цю форму з атрибутом form і передають slot_start як значення кнопки (AC-HOLD-02, AC-HOLD-10).
// Форма лишається змонтованою після утримання, тож повідомлення про успіх видно.
export function HoldSlotForm(props: { therapistId: string; clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(holdSlot, initialState);

  return (
    <form id={HOLD_FORM_ID} action={formAction} className="flex flex-col gap-2" aria-busy={pending}>
      <input type="hidden" name="therapist_id" value={props.therapistId} />
      <label className="flex flex-col gap-1 text-sm">
        Client to hold a slot for
        <select
          name="client_id"
          defaultValue=""
          className="min-h-11 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Choose a client
          </option>
          {props.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      {pending ? <p className="text-sm text-zinc-500">Holding…</p> : <ActionMessage state={state} />}
    </form>
  );
}
