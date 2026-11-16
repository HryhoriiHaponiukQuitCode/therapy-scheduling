"use server";

import { redirect } from "next/navigation";
import { productModel } from "@/lib/ai/anthropic";
import { draftIntakeFor, type IntakeState } from "@/lib/intake";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { practiceDate } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

// Чернетка картки клієнта з тексту звернення (AC-INTAKE-01…09). Порядок: сесія (getClaims) → роль → лише потім
// модель (draftIntakeFor). Нічого не пише в базу: картку створює людина окремою дією createClientCard
// (AC-INTAKE-03). Текст звернення не зберігаємо й не логуємо.
export async function requestIntakeDraft(_prev: IntakeState, formData: FormData): Promise<IntakeState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }
  const request = String(formData.get("request") ?? "");
  // Модель лише для працівника: терапевт не дістається навіть до читання ключа.
  return draftIntakeFor(user.role, request, isStaff(user.role) ? productModel() : null, practiceDate(new Date()));
}
