// Користувач поточного рендера: layout застосунку і сторінка викликають це разом, а getClaims і запит профілю
// виконуються один раз на запит (React cache). Окремо від roles.ts, щоб ті хелпери не тягнули next/headers.
// Server actions і далі викликають getCurrentUser напряму.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, pageAccess, type AppRole } from "@/lib/roles";

export const getRequestUser = cache(async () => getCurrentUser(await createClient()));

// Доступ до сторінки (impl-client-cards, design.md → Auth): без входу — redirect на /login (AC-CARD-07);
// інакше — no-role (AC-CARD-11), forbidden з текстом AC (AC-HOLD-44) або ok з користувачем.
export async function getPageAccess(allowed: readonly AppRole[], forbiddenMessage: string) {
  const access = pageAccess(await getRequestUser(), allowed, forbiddenMessage);
  if (access.kind === "anon") {
    redirect("/login");
  }
  return access;
}
