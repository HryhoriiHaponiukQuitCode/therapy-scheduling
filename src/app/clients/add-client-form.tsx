"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/button";
import { Field, Input } from "@/components/field";
import { CLIENT_EMAIL_MAX, CLIENT_NAME_MAX } from "@/lib/clients";
import { addClient, type AddClientState } from "./actions";

const initialState: AddClientState = { status: "idle" };

export function AddClientForm() {
  const [state, formAction, pending] = useActionState(addClient, initialState);
  // React 19 скидає форму до defaultValue після дії: після помилки повертаємо введене.
  const values = state.status === "error" ? state.values : { fullName: "", email: "" };
  const invalid = state.status === "error" || undefined;

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
          aria-invalid={invalid}
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
          aria-invalid={invalid}
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
