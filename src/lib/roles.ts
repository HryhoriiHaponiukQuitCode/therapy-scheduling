// Ролі продукту (requirements/product.md): admin, scheduler, therapist.
// Роль читаємо з public.profiles (RLS: власний профіль), ніколи з user_metadata.
import type { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "scheduler" | "therapist";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

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
    role: (profile?.role ?? null) as AppRole | null,
  };
}
