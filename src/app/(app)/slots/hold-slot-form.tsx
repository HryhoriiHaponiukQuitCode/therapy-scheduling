"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ActionMessage } from "@/components/action-message";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { CLIENT_SEARCH_MAX } from "@/lib/clients";
import { holdFormId } from "@/lib/holds";
import { findClients, holdSlot, type HoldSlotState } from "./actions";
import type { ClientChoices } from "./data";
import { useHoldClient } from "./hold-client";

const initialState: HoldSlotState = { status: "idle" };

// Утримання на /slots: клієнт вибирається один раз у полі «Client» з пошуком усередині (ім'я, email або email
// опікуна, AC-CARD-02; біля дитини — email опікуна), а на кожного терапевта — своя форма з прихованими therapist_id
// і client_id; кнопки Hold його колонки надсилають її через атрибут form і передають slot_start як значення кнопки
// (AC-HOLD-02, AC-HOLD-10). Поки клієнта не вибрано, кнопки Hold вимкнені (HoldButton), причина — під полем.
// Поле й форми — окремо: сторінка ставить форми (їхні повідомлення) у sticky-область над сіткою.
export function HoldClientPicker(props: { heading: ReactNode; initial: ClientChoices }) {
  const { clientId, setClientId } = useHoldClient();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {props.heading}
        <Field label="Client" htmlFor="hold-client" className="min-w-0 flex-[0_1_420px] max-[760px]:flex-auto">
          <Combobox
            id="hold-client"
            placeholder="Choose a client"
            searchLabel="Find a client"
            searchPlaceholder="Name or email"
            maxLength={CLIENT_SEARCH_MAX}
            initial={props.initial}
            search={findClients}
            onChange={setClientId}
          />
        </Field>
      </div>
      {!clientId ? (
        <p className="m-0 text-sm text-muted-foreground" data-testid="hold-client-hint">
          Choose a client to hold a slot.
        </p>
      ) : null}
    </div>
  );
}

// Форма утримання на кожного терапевта. Лишаються змонтованими після утримання, тож повідомлення про успіх видно;
// показуємо результат лише останньої відправленої форми, інші — порожні live-області (ActionMessage не демонтуємо).
export function HoldForms(props: { therapistIds: string[] }) {
  const { clientId } = useHoldClient();
  const [lastTherapist, setLastTherapist] = useState<string | null>(null);
  return props.therapistIds.map((therapistId) => (
    <TherapistHoldForm
      key={therapistId}
      therapistId={therapistId}
      clientId={clientId}
      shown={lastTherapist === therapistId}
      onSubmit={() => setLastTherapist(therapistId)}
    />
  ));
}

function TherapistHoldForm(props: { therapistId: string; clientId: string; shown: boolean; onSubmit: () => void }) {
  const [state, formAction, pending] = useActionState(holdSlot, initialState);
  return (
    <form id={holdFormId(props.therapistId)} action={formAction} onSubmit={props.onSubmit} aria-busy={pending} className="contents">
      <input type="hidden" name="therapist_id" value={props.therapistId} />
      <input type="hidden" name="client_id" value={props.clientId} />
      {pending ? <p className="m-0 w-fit rounded-full bg-accent px-4 py-2 text-sm text-muted-foreground">Holding…</p> : null}
      <ActionMessage state={props.shown ? state : initialState} />
    </form>
  );
}
