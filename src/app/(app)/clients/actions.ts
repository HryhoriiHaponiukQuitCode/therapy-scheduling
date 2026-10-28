"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import {
  CLIENT_FORBIDDEN_MESSAGE,
  clientInsertErrorMessage,
  EMPTY_CLIENT_CARD,
  validateClientCard,
  type ClientCardErrors,
  type ClientCardField,
  type ClientCardValues,
} from "@/lib/clients";
import { practiceDate } from "@/lib/slots";

export type ClientCardState =
  | { status: "idle" }
  | { status: "error"; message: string | null; errors: ClientCardErrors; values: ClientCardValues }
  | { status: "success"; message: string; at: number };

// Створення картки клієнта з анкети (AC-CARD-01, 02, 03, 06, 12, 13; AC-HOLD-10, 11, 15, 16, 34, 35, 39, 41).
// Порядок: сесія (getClaims) → роль з profiles → дані → insert клієнтом користувача. RLS clients_insert_staff,
// constraint, тригер і унікальні індекси бази — остання лінія захисту.
export async function createClientCard(_prevState: ClientCardState, formData: FormData): Promise<ClientCardState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  // Введене повертаємо в стані помилки: React 19 скидає форму після кожної дії.
  const values = Object.fromEntries(
    (Object.keys(EMPTY_CLIENT_CARD) as ClientCardField[]).map((field) => [field, String(formData.get(field) ?? "")]),
  ) as ClientCardValues;

  if (!isStaff(user.role)) {
    return { status: "error", message: CLIENT_FORBIDDEN_MESSAGE, errors: {}, values };
  }

  const result = validateClientCard(values, practiceDate(new Date()));
  if (!result.ok) {
    return { status: "error", message: null, errors: result.errors, values };
  }

  const { error } = await supabase.from("clients").insert(result.value);
  if (error) {
    return { status: "error", message: clientInsertErrorMessage(error), errors: {}, values };
  }

  revalidatePath("/clients");
  // Поле «Client» на /slots бере перших клієнтів із тієї ж таблиці (ADR 0002: кеш навігації 30 с).
  revalidatePath("/slots");
  return { status: "success", message: `Client "${result.value.full_name}" created.`, at: Date.now() };
}
