"use client";

import { useActionState, useState } from "react";
import { ActionMessage, type ActionResult } from "@/components/action-message";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INTAKE_REQUEST_MAX } from "@/lib/ai/prompts/intake";
import {
  CLIENT_EMAIL_MAX,
  CLIENT_NAME_MAX,
  EMPTY_CLIENT_CARD,
  SESSION_LANGUAGES,
  type ClientCardErrors,
  type ClientCardField,
  type ClientCardValues,
} from "@/lib/clients";
import { INTAKE_HINT, type IntakeState } from "@/lib/intake";
import { createClientCard, type ClientCardState } from "../actions";
import { requestIntakeDraft } from "../intake-actions";

const initialState: ClientCardState = { status: "idle" };
const initialDraft: IntakeState = { status: "idle" };

const TYPE_OPTIONS = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
];
const LANGUAGE_OPTIONS = SESSION_LANGUAGES.map((language) => ({ value: language, label: language }));

// Повна форма картки з анкети (AC-CARD-01, 02, 03, 12, 13): тип, ім'я, дата народження, мова; для дорослого — email,
// для дитини — ім'я та email опікуна. Помилки — усі одразу, кожна біля свого поля; введене лишається у формі.
// Над нею — окрема форма «Client request» (зріз 4): чернетка заповнює поля, але картку створює лише «Create client»
// (AC-INTAKE-03). Відмова й «недоступний» поля не змінюють (AC-INTAKE-06, 07, 08).
export function ClientCardForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(createClientCard, initialState);
  const [draft, draftAction, drafting] = useActionState(requestIntakeDraft, initialDraft);
  const cardAt = state.status === "idle" ? 0 : state.at;
  const draftAt = draft.status === "draft" ? draft.at : 0;
  const fromDraft = draft.status === "draft" && draftAt > cardAt;
  // Нова чернетка замінює всю форму (новий key); після успіху — порожня форма; після помилки — введені значення.
  const values = fromDraft ? draft.values : state.status === "error" ? state.values : EMPTY_CLIENT_CARD;
  const errors = !fromDraft && state.status === "error" ? state.errors : {};
  const fieldsKey = fromDraft ? `draft-${draftAt}` : state.status === "success" ? `created-${state.at}` : "form";
  const message: ActionResult =
    state.status === "success"
      ? { status: "success", message: state.message }
      : state.status === "error" && state.message
        ? { status: "error", message: state.message }
        : { status: "idle" };
  const draftMessage: ActionResult =
    draft.status === "idle"
      ? { status: "idle" }
      : draft.status === "draft" && draft.complete
        ? { status: "success", message: draft.message }
        : { status: "error", message: draft.message };

  return (
    <div className="flex flex-col gap-6">
      <form action={draftAction} className="flex flex-col gap-3" aria-label="Draft from a client request">
        <Field label="Client request" htmlFor="client-request">
          <Textarea
            id="client-request"
            name="request"
            maxLength={INTAKE_REQUEST_MAX}
            aria-describedby="client-request-hint"
            defaultValue={draft.status === "idle" ? "" : draft.request}
            key={draft.status === "idle" ? "request" : `request-${draft.at}`}
          />
        </Field>
        <p id="client-request-hint" className="m-0 text-xs text-muted-foreground">
          {INTAKE_HINT}
        </p>
        <div>
          <Button type="submit" variant="glass" pending={drafting}>
            {drafting ? "Drafting…" : "Draft card"}
          </Button>
        </div>
        <ActionMessage state={draftMessage} />
      </form>
      <form action={formAction} className="flex flex-col gap-4 border-t border-border pt-6" noValidate>
        <CardFields key={fieldsKey} values={values} errors={errors} today={today} />
        <ActionMessage state={message} />
        <div>
          <Button type="submit" variant="primary" pending={pending}>
            {pending ? "Creating…" : "Create client"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CardFields({ values, errors, today }: { values: ClientCardValues; errors: ClientCardErrors; today: string }) {
  const [type, setType] = useState(values.client_type);
  const invalid = (field: ClientCardField) => (errors[field] ? true : undefined);
  const text = (field: ClientCardField, label: string, props: { type?: string; maxLength?: number; max?: string }) => (
    <Field label={label} htmlFor={`client-${field}`} error={errors[field]}>
      <Input
        id={`client-${field}`}
        name={field}
        type={props.type ?? "text"}
        autoComplete="off"
        maxLength={props.maxLength}
        max={props.max}
        defaultValue={values[field]}
        aria-invalid={invalid(field)}
      />
    </Field>
  );

  return (
    <>
      <Field label="Client type" htmlFor="client-client_type" error={errors.client_type}>
        <Select
          id="client-client_type"
          name="client_type"
          options={TYPE_OPTIONS}
          defaultValue={values.client_type}
          placeholder="Select a client type"
          onChange={setType}
          avatars={false}
          invalid={invalid("client_type")}
        />
      </Field>
      {text("full_name", "Name", { maxLength: CLIENT_NAME_MAX })}
      {text("birth_date", "Date of birth", { type: "date", max: today })}
      <Field label="Session language" htmlFor="client-session_language" error={errors.session_language}>
        <Select
          id="client-session_language"
          name="session_language"
          options={LANGUAGE_OPTIONS}
          defaultValue={values.session_language}
          placeholder="Select a language"
          avatars={false}
          invalid={invalid("session_language")}
        />
      </Field>
      {type === "adult" ? text("email", "Email", { type: "email", maxLength: CLIENT_EMAIL_MAX }) : null}
      {type === "child" ? (
        <>
          {text("guardian_name", "Guardian name", { maxLength: CLIENT_NAME_MAX })}
          {text("guardian_email", "Guardian email", { type: "email", maxLength: CLIENT_EMAIL_MAX })}
        </>
      ) : null}
    </>
  );
}
