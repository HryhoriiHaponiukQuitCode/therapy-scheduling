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
import { INTAKE_EMPTY_MESSAGE, INTAKE_HINT, type IntakeState } from "@/lib/intake";
import { createClientCard, type ClientCardState } from "../actions";
import { requestIntakeDraft } from "../intake-actions";

const initialState: ClientCardState = { status: "idle" };
const initialDraft: IntakeState = { status: "idle" };

const TYPE_OPTIONS = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
];
const LANGUAGE_OPTIONS = SESSION_LANGUAGES.map((language) => ({ value: language, label: language }));

// Що показати у формі картки: нова чернетка замінює всю форму (новий key); після успіху — порожня форма;
// після помилки — введені значення. Відмова й «недоступний» форму картки не змінюють (AC-INTAKE-06, 07, 08).
function cardView(state: ClientCardState, draft: IntakeState) {
  const cardAt = state.status === "idle" ? 0 : state.at;
  if (draft.status === "draft" && draft.at > cardAt) {
    return { values: draft.values, errors: {}, key: `draft-${draft.at}` };
  }
  if (state.status === "error") return { values: state.values, errors: state.errors, key: "form" };
  return { values: EMPTY_CLIENT_CARD, errors: {}, key: state.status === "success" ? `created-${state.at}` : "form" };
}

function cardMessage(state: ClientCardState): ActionResult {
  if (state.status === "success") return { status: "success", message: state.message };
  if (state.status === "error" && state.message) return { status: "error", message: state.message };
  return { status: "idle" };
}

// Неповна чернетка — не помилка: поля заповнено, бракує лише частини (AC-INTAKE-04), тож тон довідковий, не destructive.
function draftMessage(draft: IntakeState): ActionResult {
  if (draft.status === "idle") return { status: "idle" };
  if (draft.status === "draft") return { status: draft.complete ? "success" : "info", message: draft.message };
  return { status: "error", message: draft.message };
}

// Текст поля «Client request» і чи воно порожнє. Поле перемонтовується з кожною відповіддю дії (key за draft.at),
// тож і ознаку «порожньо» скидаємо за тим самим draft.at (оновлення стану під час рендеру, без ефекту).
function useRequestField(draft: IntakeState) {
  const shown = draft.status === "idle" ? "" : draft.request;
  const at = draft.status === "idle" ? 0 : draft.at;
  const [empty, setEmpty] = useState(!shown.trim());
  const [seenAt, setSeenAt] = useState(at);
  if (seenAt !== at) {
    setSeenAt(at);
    setEmpty(!shown.trim());
  }
  return { shown, key: `request-${at}`, empty, onText: (text: string) => setEmpty(!text.trim()) };
}

// Окрема форма «Client request» (зріз 4): дія чернетки не надсилає й не скидає форму картки.
// Без тексту «Draft card» вимкнена з причиною поруч (DESIGN.md, 6a).
function DraftRequestForm({ draft, action, pending }: { draft: IntakeState; action: (data: FormData) => void; pending: boolean }) {
  const field = useRequestField(draft);
  const reason = field.empty && !pending;
  return (
    <form action={action} className="flex flex-col gap-3" aria-label="Draft from a client request">
      <Field label="Client request" htmlFor="client-request">
        <Textarea
          id="client-request"
          name="request"
          maxLength={INTAKE_REQUEST_MAX}
          aria-describedby="client-request-hint"
          defaultValue={field.shown}
          key={field.key}
          onChange={(event) => field.onText(event.currentTarget.value)}
        />
      </Field>
      <p id="client-request-hint" className="m-0 text-xs text-muted-foreground">
        {INTAKE_HINT}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glass" pending={pending} disabled={field.empty}>
          {pending ? "Drafting…" : "Draft card"}
        </Button>
        {reason ? (
          <p className="m-0 text-sm text-muted-foreground" data-testid="draft-request-reason">
            {INTAKE_EMPTY_MESSAGE}
          </p>
        ) : null}
      </div>
      <ActionMessage state={draftMessage(draft)} />
    </form>
  );
}

// Повна форма картки з анкети (AC-CARD-01, 02, 03, 12, 13): тип, ім'я, дата народження, мова; для дорослого — email,
// для дитини — ім'я та email опікуна. Помилки — усі одразу, кожна біля свого поля; введене лишається у формі.
// Над нею — чернетка з тексту звернення: заповнює поля, але картку створює лише «Create client» (AC-INTAKE-03).
export function ClientCardForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(createClientCard, initialState);
  const [draft, draftAction, drafting] = useActionState(requestIntakeDraft, initialDraft);
  const view = cardView(state, draft);

  return (
    <div className="flex flex-col gap-6">
      <DraftRequestForm draft={draft} action={draftAction} pending={drafting} />
      <form action={formAction} className="flex flex-col gap-4 border-t border-border pt-6" noValidate>
        <CardFields key={view.key} values={view.values} errors={view.errors} today={today} />
        <ActionMessage state={cardMessage(state)} />
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
