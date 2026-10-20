"use client";

import { useActionState, type ReactNode } from "react";
import { ActionMessage } from "@/components/action-message";
import { Field } from "@/components/field";
import { Select } from "@/components/select";
import { HOLD_FORM_ID } from "@/lib/holds";
import { holdSlot, type HoldSlotState } from "./actions";
import type { ClientOption } from "./data";

const initialState: HoldSlotState = { status: "idle" };

// Одна форма утримання на сторінку: клієнт вибирається один раз, а кнопки Hold у рядках вільних слотів
// надсилають цю форму з атрибутом form і передають slot_start як значення кнопки (AC-HOLD-02, AC-HOLD-10).
// Форма лишається змонтованою після утримання, тож повідомлення про успіх видно.
// Вигляд (design-system.md, розділ 5): заголовок панелі зліва, Select «Client to hold a slot for» справа, під ними
// ActionMessage; client_id — прихованим полем Select.
export function HoldSlotForm(props: { heading: ReactNode; therapistId: string; clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(holdSlot, initialState);

  return (
    <form id={HOLD_FORM_ID} action={formAction} className="flex flex-col gap-3" aria-busy={pending}>
      <input type="hidden" name="therapist_id" value={props.therapistId} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        {props.heading}
        <Field label="Client to hold a slot for" htmlFor="hold-client" className="min-w-0 flex-[0_1_320px] max-[760px]:flex-auto">
          <Select
            id="hold-client"
            name="client_id"
            placeholder="Choose a client"
            options={props.clients.map((client) => ({ value: client.id, label: client.name }))}
          />
        </Field>
      </div>
      {/* ActionMessage не демонтуємо під час pending: інакше результат дії не оголошується. */}
      {pending ? <p className="m-0 text-sm text-muted">Holding…</p> : null}
      <ActionMessage state={state} />
    </form>
  );
}
