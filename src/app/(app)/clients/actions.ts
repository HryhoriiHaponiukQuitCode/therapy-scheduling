"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import {
  CLIENT_FORBIDDEN_MESSAGE,
  clientInsertErrorMessage,
  validateClient,
} from "@/lib/clients";

export type ClientFormValues = { fullName: string; email: string };

export type AddClientState =
  | { status: "idle" }
  | { status: "error"; message: string; values: ClientFormValues }
  | { status: "success"; message: string };

// Створення картки клієнта (AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16).
// Порядок: сесія → роль → дані. RLS (clients_insert_staff) — остання лінія захисту.
export async function addClient(
  _prevState: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  // Введене повертаємо в стані помилки: React 19 скидає форму після кожної дії.
  const values: ClientFormValues = {
    fullName: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  if (!isStaff(user.role)) {
    return { status: "error", message: CLIENT_FORBIDDEN_MESSAGE, values };
  }

  const result = validateClient(values.fullName, values.email);
  if (!result.ok) {
    return { status: "error", message: result.message, values };
  }

  const { fullName, email } = result.value;
  const { error } = await supabase.from("clients").insert({ full_name: fullName, email });
  if (error) {
    return { status: "error", message: clientInsertErrorMessage(error.code), values };
  }

  revalidatePath("/clients");
  return { status: "success", message: `Client "${fullName}" created.` };
}
