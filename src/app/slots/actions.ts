"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { checkHoldRequest, HOLD_MESSAGES, holdErrorMessage } from "@/lib/holds";

export type HoldSlotState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

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

  const code = checkHoldRequest({ isStaff: isStaff(user.role), slotStart, clientId, now: new Date() });
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
  return { status: "success", message: "Slot held for 24 hours." };
}
