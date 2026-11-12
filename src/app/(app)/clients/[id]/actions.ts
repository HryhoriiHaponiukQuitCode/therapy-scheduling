"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-message";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/roles";
import { isClientId } from "@/lib/clients";
import {
  canChangeInsurance,
  INSURANCE_CHOOSE_MESSAGE,
  INSURANCE_FIELD,
  INSURANCE_FORBIDDEN_MESSAGE,
  INSURANCE_NO_CLIENT_MESSAGE,
  INSURANCE_SAVE_ERROR_MESSAGE,
  INSURANCE_SAVED_MESSAGE,
  parseInsuranceStatus,
} from "@/lib/insurance";

// Зміна статусу перевірки страхування в картці (AC-INS-02, 03, 05, 06). Форма викликає дію через
// setInsuranceStatus.bind(null, id). Порядок: сесія (getClaims) → id картки → роль з profiles → значення → update
// клієнтом користувача. RLS clients_update_insurance_staff і колонковий grant — остання лінія захисту (AC-INS-05).
export async function setInsuranceStatus(
  clientId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login"); // AC-INS-06: без входу — лише сторінка входу, без запису
  }

  // Аргумент дії приходить від клієнта: не UUID — без звернення до clients (інакше Postgres відповів би 22P02).
  if (!isClientId(clientId)) {
    return { status: "error", message: INSURANCE_NO_CLIENT_MESSAGE };
  }
  if (!canChangeInsurance(user.role)) {
    return { status: "error", message: INSURANCE_FORBIDDEN_MESSAGE }; // AC-INS-05
  }
  const status = parseInsuranceStatus(formData.get(INSURANCE_FIELD));
  if (!status) {
    return { status: "error", message: INSURANCE_CHOOSE_MESSAGE };
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ insurance_status: status })
    .eq("id", clientId)
    .select("id");
  if (error) {
    return { status: "error", message: INSURANCE_SAVE_ERROR_MESSAGE };
  }
  // 0 рядків — картки немає або RLS не пустила.
  if (!data?.length) {
    return { status: "error", message: INSURANCE_NO_CLIENT_MESSAGE };
  }

  // Повторне відкриття картки показує новий статус (AC-INS-02); список клієнтів і поле «Client» на /slots — з тієї
  // ж таблиці (ADR 0002: кеш навігації 30 с). Літеральний шлях, а не шаблон "/clients/[id]": сторінка лежить у групі
  // (app), і тег шаблону без групи не збігається з неявним тегом сторінки (docs: revalidatePath, «route groups»).
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/slots");
  return { status: "success", message: INSURANCE_SAVED_MESSAGE }; // AC-INS-02
}
