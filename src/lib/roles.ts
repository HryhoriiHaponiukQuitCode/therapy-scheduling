// Ролі продукту (requirements/product.md): admin, scheduler, therapist.
// Роль читаємо з public.profiles (RLS: власний профіль), ніколи з user_metadata.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const APP_ROLES = ["admin", "scheduler", "therapist"] as const;
export type AppRole = (typeof APP_ROLES)[number];

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && (APP_ROLES as readonly string[]).includes(role);
}

export function isStaff(role: string | null | undefined): role is "admin" | "scheduler" {
  return role === "admin" || role === "scheduler";
}

// Поточний користувач і його роль; null — немає сесії.
export async function getCurrentUser(supabase: ServerClient) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: profile?.email ?? (typeof claims.email === "string" ? claims.email : null),
    // Невідома роль (наприклад, міграцію ще не застосовано) — як відсутність ролі.
    role: isAppRole(profile?.role) ? profile.role : null,
  };
}

// Користувач поточного рендера: layout розділу і сторінка викликають це разом, а getClaims і запит профілю
// виконуються один раз на запит (React cache). Server actions і далі викликають getCurrentUser напряму.
export const getRequestUser = cache(async () => getCurrentUser(await createClient()));
