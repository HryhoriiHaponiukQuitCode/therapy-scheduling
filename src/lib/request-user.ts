// Користувач поточного рендера: layout застосунку і сторінка викликають це разом, а getClaims і запит профілю
// виконуються один раз на запит (React cache). Окремо від roles.ts, щоб ті хелпери не тягнули next/headers.
// Server actions і далі викликають getCurrentUser напряму.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/roles";

export const getRequestUser = cache(async () => getCurrentUser(await createClient()));
