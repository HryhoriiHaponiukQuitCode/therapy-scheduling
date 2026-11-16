"use server";

import { redirect } from "next/navigation";
import { productModel } from "@/lib/ai/anthropic";
import { draftIntakeFor, type IntakeState } from "@/lib/intake";
import { getCurrentUser } from "@/lib/roles";
import { practiceDate } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

// Чернетка картки клієнта з тексту звернення (AC-INTAKE-01…09). Порядок: сесія (getClaims) → роль → лише потім
// денний ліміт і модель (draftIntakeFor). Нічого не пише в базу: картку створює людина окремою дією createClientCard
// (AC-INTAKE-03). Текст звернення не зберігаємо й не логуємо.
export async function requestIntakeDraft(_prev: IntakeState, formData: FormData): Promise<IntakeState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }
  const request = String(formData.get("request") ?? "");
  // Модель і ліміт — фабриками: draftIntakeFor викликає їх лише після перевірки ролі (терапевт до ключа не дістається).
  return draftIntakeFor(user.role, request, practiceDate(new Date()), {
    model: productModel,
    // Денний ліміт (AC-INTAKE-08): RPC списує запит під сесією користувача; помилка RPC — як вичерпаний ліміт.
    takeQuota: async () => {
      const { data, error } = await supabase.rpc("take_intake_draft_quota");
      return !error && data === true;
    },
  });
}
