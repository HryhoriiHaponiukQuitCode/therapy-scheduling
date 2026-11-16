"use server";

import { redirect } from "next/navigation";
import { productModel } from "@/lib/ai/anthropic";
import { proposeIntake } from "@/lib/ai/draft";
import { INTAKE_REQUEST_MAX } from "@/lib/ai/prompts/intake";
import { CLIENT_FORBIDDEN_MESSAGE } from "@/lib/clients";
import { ASSISTANT_UNAVAILABLE_MESSAGE, INTAKE_EMPTY_MESSAGE, intakeOutcome, type IntakeState } from "@/lib/intake";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { practiceDate } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

// Чернетка картки клієнта з тексту звернення (AC-INTAKE-01…09). Нічого не пише в базу: повертає значення у форму,
// картку створює людина окремою дією createClientCard (AC-INTAKE-03). Порядок: сесія (getClaims) → роль → лише
// потім модель (AC-INTAKE-09). Текст звернення не зберігаємо й не логуємо.
export async function requestIntakeDraft(_prev: IntakeState, formData: FormData): Promise<IntakeState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  const at = Date.now();
  const request = String(formData.get("request") ?? "").slice(0, INTAKE_REQUEST_MAX);
  if (!isStaff(user.role)) {
    return { status: "forbidden", message: CLIENT_FORBIDDEN_MESSAGE, request: "", at };
  }
  if (!request.trim()) {
    return { status: "invalid", message: INTAKE_EMPTY_MESSAGE, request, at };
  }

  const model = productModel();
  if (!model) {
    // Немає ключа — помічник недоступний, ручна форма працює (AC-INTAKE-08).
    return { status: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE, request, at };
  }
  const result = await proposeIntake(request, model);
  return intakeOutcome(result, practiceDate(new Date()), request, at);
}
