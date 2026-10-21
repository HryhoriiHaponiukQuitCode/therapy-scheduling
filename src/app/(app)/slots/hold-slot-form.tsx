"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ActionMessage } from "@/components/action-message";
import { Field } from "@/components/field";
import { Select } from "@/components/select";
import { holdFormId } from "@/lib/holds";
import { holdSlot, type HoldSlotState } from "./actions";
import type { ClientOption } from "./data";

const initialState: HoldSlotState = { status: "idle" };

// Утримання на /slots: клієнт вибирається один раз (Select «Client to hold a slot for»), а на кожного терапевта —
// своя форма з прихованими therapist_id і client_id; кнопки Hold його колонки надсилають її через атрибут form і
// передають slot_start як значення кнопки (AC-HOLD-02, AC-HOLD-10). Поля server action ті самі, що й раніше.
// Форми лишаються змонтованими після утримання, тож повідомлення про успіх видно; показуємо результат лише
// останньої відправленої форми, інші — порожні live-області (ActionMessage не демонтуємо).
// Вигляд (design-system.md, розділ 5): заголовок панелі зліва, Select справа, під ними ActionMessage.
export function HoldSlotForm(props: { heading: ReactNode; therapistIds: string[]; clients: ClientOption[] }) {
  const [clientId, setClientId] = useState("");
  const [lastTherapist, setLastTherapist] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {props.heading}
        <Field label="Client to hold a slot for" htmlFor="hold-client" className="min-w-0 flex-[0_1_320px] max-[760px]:flex-auto">
          <Select
            id="hold-client"
            placeholder="Choose a client"
            options={props.clients.map((client) => ({ value: client.id, label: client.name }))}
            onChange={setClientId}
          />
        </Field>
      </div>
      {/* Без gap: порожні live-області форм не мають додавати відступів. */}
      <div className="flex flex-col">
        {props.therapistIds.map((therapistId) => (
          <TherapistHoldForm
            key={therapistId}
            therapistId={therapistId}
            clientId={clientId}
            shown={lastTherapist === therapistId}
            onSubmit={() => setLastTherapist(therapistId)}
          />
        ))}
      </div>
    </div>
  );
}

function TherapistHoldForm(props: { therapistId: string; clientId: string; shown: boolean; onSubmit: () => void }) {
  const [state, formAction, pending] = useActionState(holdSlot, initialState);
  return (
    <form id={holdFormId(props.therapistId)} action={formAction} onSubmit={props.onSubmit} aria-busy={pending} className="contents">
      <input type="hidden" name="therapist_id" value={props.therapistId} />
      <input type="hidden" name="client_id" value={props.clientId} />
      {pending ? <p className="m-0 text-sm text-muted">Holding…</p> : null}
      <ActionMessage state={props.shown ? state : initialState} />
    </form>
  );
}
