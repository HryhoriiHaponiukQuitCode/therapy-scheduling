"use client";

import { useActionState } from "react";
import { addClient, type AddClientState } from "./actions";

const initialState: AddClientState = { status: "idle" };

export function AddClientForm() {
  const [state, formAction, pending] = useActionState(addClient, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="full_name"
          type="text"
          autoComplete="off"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="off"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <p
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
        className={state.status === "error" ? "min-h-5 text-sm text-red-600" : "min-h-5 text-sm text-green-700"}
      >
        {state.status === "idle" ? "" : state.message}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create client"}
      </button>
    </form>
  );
}
