// Ролі продукту (requirements/product.md): admin, scheduler, therapist.
// Роль читаємо з public.profiles (RLS: власний профіль), ніколи з user_metadata.
import type { createClient } from "@/lib/supabase/server";

const APP_ROLES = ["admin", "scheduler", "therapist"] as const;
export type AppRole = (typeof APP_ROLES)[number];

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && (APP_ROLES as readonly string[]).includes(role);
}

export function isStaff(role: string | null | undefined): role is "admin" | "scheduler" {
  return role === "admin" || role === "scheduler";
}

// Тексти PM (openspec/specs/client-access/spec.md, slot-holds/spec.md).
export const NO_ROLE_MESSAGE = "Your account has no access yet. Contact an administrator."; // AC-CARD-11
export const STAFF_ONLY_PAGE_MESSAGE = "Only schedulers and admins can view this page."; // AC-HOLD-44

export const STAFF_ROLES = ["admin", "scheduler"] as const satisfies readonly AppRole[];

type PageUser = { role: AppRole | null } | null;

// Хто що бачить на сторінці (перевірка до будь-якого запиту даних):
// без входу — на /login (AC-CARD-07); без ролі — лише NO_ROLE_MESSAGE і «Sign out» (AC-CARD-11);
// роль не з allowed — відмова з текстом AC (AC-HOLD-44). Дані охороняє ще й RLS.
export type PageAccess<U> =
  | { kind: "anon" }
  | { kind: "no-role" }
  | { kind: "forbidden"; message: string }
  | { kind: "ok"; user: U & { role: AppRole } };

export function pageAccess<U extends PageUser>(
  user: U,
  allowed: readonly AppRole[],
  forbiddenMessage: string,
): PageAccess<NonNullable<U>> {
  if (!user) return { kind: "anon" };
  const role = user.role;
  if (role === null) return { kind: "no-role" };
  if (!allowed.includes(role)) return { kind: "forbidden", message: forbiddenMessage };
  return { kind: "ok", user: user as NonNullable<U> & { role: AppRole } };
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
