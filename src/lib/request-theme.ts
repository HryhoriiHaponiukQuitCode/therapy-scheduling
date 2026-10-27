// Тема поточного запиту з cookie: кореневий layout ставить клас .dark на <html>, AppShell передає перемикачу.
// React cache — cookie читається один раз на запит.
import { cookies } from "next/headers";
import { cache } from "react";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const getRequestTheme = cache(async () => parseTheme((await cookies()).get(THEME_COOKIE)?.value));
