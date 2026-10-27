"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  CLIENT_DUPLICATE_MESSAGE,
  CLIENT_EMAIL_MAX,
  CLIENT_INVALID_MESSAGE,
  CLIENT_NAME_MAX,
  validateClient,
} from "@/lib/clients";
import { addClient, type AddClientState } from "./actions";

const initialState: AddClientState = { status: "idle" };

export function AddClientForm() {
  const [state, formAction, pending] = useActionState(addClient, initialState);
  // React 19 скидає форму до defaultValue після дії: після помилки повертаємо введене.
  const values = state.status === "error" ? state.values : { fullName: "", email: "" };
  // aria-invalid — лише на полі, якого стосується помилка; помилка прав чи збою не позначає жодного поля.
  const message = state.status === "error" ? state.message : null;
  const nameInvalid = message === CLIENT_INVALID_MESSAGE && !validateClient(values.fullName, "client@example.test").ok;
  const emailInvalid =
    message === CLIENT_DUPLICATE_MESSAGE ||
    (message === CLIENT_INVALID_MESSAGE && !validateClient("Client", values.email).ok);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label="Name" htmlFor="client-name">
        <Input
          id="client-name"
          name="full_name"
          type="text"
          autoComplete="off"
          maxLength={CLIENT_NAME_MAX}
          defaultValue={values.fullName}
          aria-invalid={nameInvalid || undefined}
        />
      </Field>
      <Field label="Email" htmlFor="client-email">
        <Input
          id="client-email"
          name="email"
          type="email"
          autoComplete="off"
          maxLength={CLIENT_EMAIL_MAX}
          defaultValue={values.email}
          aria-invalid={emailInvalid || undefined}
        />
      </Field>
      <ActionMessage state={state} />
      <div>
        <Button type="submit" variant="primary" pending={pending}>
          {pending ? "Creating…" : "Create client"}
        </Button>
      </div>
    </form>
  );
}
