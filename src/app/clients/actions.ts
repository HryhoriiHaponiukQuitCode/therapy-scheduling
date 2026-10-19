"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clientInsertErrorMessage, validateClient } from "@/lib/clients";

export type AddClientState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

// Створення картки клієнта (AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16).
// Хто може створювати — вирішує RLS (clients_insert_staff): admin і scheduler.
export async function addClient(
  _prevState: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const result = validateClient(formData.get("full_name"), formData.get("email"));
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login");
  }

  const { fullName, email } = result.value;
  const { error } = await supabase.from("clients").insert({ full_name: fullName, email });
  if (error) {
    return { status: "error", message: clientInsertErrorMessage(error.code) };
  }

  revalidatePath("/clients");
  return { status: "success", message: `Client "${fullName}" created.` };
}
