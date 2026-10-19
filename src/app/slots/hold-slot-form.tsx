"use client";

import { useActionState } from "react";
import { holdSlot, type HoldSlotState } from "./actions";
import type { ClientOption } from "./data";

const initialState: HoldSlotState = { status: "idle" };

// Утримання одного вільного слоту за вибраним клієнтом (AC-HOLD-02, AC-HOLD-10).
export function HoldSlotForm(props: {
  therapistId: string;
  slotStart: string;
  time: string;
  clients: ClientOption[];
}) {
  const [state, formAction, pending] = useActionState(holdSlot, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="therapist_id" value={props.therapistId} />
      <input type="hidden" name="slot_start" value={props.slotStart} />
      <label className="sr-only" htmlFor={`client-${props.time}`}>
        Client for {props.time}
      </label>
      <select
        id={`client-${props.time}`}
        name="client_id"
        defaultValue=""
        className="min-h-11 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
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
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded bg-foreground px-3 py-1 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? "Holding…" : "Hold"}
      </button>
      {state.status !== "idle" ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`w-full text-sm ${state.status === "error" ? "text-red-600" : "text-green-700"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
