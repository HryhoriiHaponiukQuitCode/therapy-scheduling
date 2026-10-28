"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import {
  checkConfirmRequest,
  checkHoldRequest,
  CONFIRM_MESSAGES,
  confirmErrorMessage,
  HOLD_MESSAGES,
  holdErrorMessage,
} from "@/lib/holds";
import type { ActionResult } from "@/components/action-message";
import { searchClients, toClientChoices, type ClientChoices } from "./data";

export type HoldSlotState = ActionResult;
export type ConfirmHoldState = ActionResult;

// Утримання вільного слоту за клієнтом на 24 години (AC-HOLD-02 … AC-HOLD-17, AC-HOLD-10 — вибір клієнта).
// Порядок: сесія → роль і дані (до бази) → private.hold_slot (роль, блокування слоту, перевірки, запис).
export async function holdSlot(_prevState: HoldSlotState, formData: FormData): Promise<HoldSlotState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  const therapistId = String(formData.get("therapist_id") ?? "");
  const slotStartRaw = String(formData.get("slot_start") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const slotStart = slotStartRaw ? new Date(slotStartRaw) : null;

  const code = checkHoldRequest({
    isStaff: isStaff(user.role),
    therapistId,
    slotStart,
    clientId,
    now: new Date(),
  });
  if (code) {
    return { status: "error", message: HOLD_MESSAGES[code] };
  }

  const { error } = await supabase.rpc("hold_slot", {
    p_therapist_id: therapistId,
    p_slot_start: slotStart!.toISOString(),
    p_client_id: clientId,
  });
  if (error) {
    return { status: "error", message: holdErrorMessage(error.message) };
  }

  revalidatePath("/slots");
  revalidatePath("/holds");
  revalidatePath("/"); // статистика головної
  return { status: "success", message: "Slot held for 24 hours." };
}

// Підтвердження утримання, коли клієнт погодився поза застосунком (AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19).
// Порядок: сесія → роль і id (до бази) → private.confirm_hold (роль, блокування слоту, прострочення, оновлення).
export async function confirmHold(
  _prevState: ConfirmHoldState,
  formData: FormData,
): Promise<ConfirmHoldState> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  // Кнопка Confirm передає «id утримання|початок слоту».
  const [holdId = "", slotStartRaw = ""] = String(formData.get("hold_id") ?? "").split("|");
  const slotStart = slotStartRaw ? new Date(slotStartRaw) : null;
  const code = checkConfirmRequest({
    isStaff: isStaff(user.role),
    holdId,
    slotStart: slotStart && !Number.isNaN(slotStart.getTime()) ? slotStart : null,
    now: new Date(),
  });
  if (code) {
    return { status: "error", message: CONFIRM_MESSAGES[code] };
  }

  const { error } = await supabase.rpc("confirm_hold", { p_hold_id: holdId });
  if (error) {
    return { status: "error", message: confirmErrorMessage(error.message) };
  }

  revalidatePath("/slots");
  revalidatePath("/holds");
  revalidatePath("/"); // статистика головної
  return { status: "success", message: "Hold confirmed. The slot is now a session." };
}

// Пошук клієнта в полі «Client» під час утримання (AC-CARD-02): ім'я, email або email опікуна. Шукає лише staff
// (як і утримує, AC-HOLD-08); остаточно межу тримає RLS таблиці clients.
export async function findClients(q: string): Promise<ClientChoices> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user || !isStaff(user.role)) {
    return { options: [], notice: null, error: HOLD_MESSAGES.NOT_STAFF };
  }
  return toClientChoices(await searchClients(supabase, typeof q === "string" ? q : ""));
}
