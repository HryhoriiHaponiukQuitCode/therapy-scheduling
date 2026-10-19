"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/action-message";
import { CLIENT_EMAIL_MAX, CLIENT_NAME_MAX } from "@/lib/clients";
import { addClient, type AddClientState } from "./actions";

const initialState: AddClientState = { status: "idle" };

export function AddClientForm() {
  const [state, formAction, pending] = useActionState(addClient, initialState);
  // React 19 скидає форму до defaultValue після дії: після помилки повертаємо введене.
  const values = state.status === "error" ? state.values : { fullName: "", email: "" };

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="full_name"
          type="text"
          autoComplete="off"
          maxLength={CLIENT_NAME_MAX}
          defaultValue={values.fullName}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="off"
          maxLength={CLIENT_EMAIL_MAX}
          defaultValue={values.email}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <ActionMessage state={state} />
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
