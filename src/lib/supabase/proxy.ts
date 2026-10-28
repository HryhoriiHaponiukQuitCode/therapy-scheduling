// Оновлення сесії Supabase на кожен запит (викликається з src/proxy.ts).
// Офіційний патерн @supabase/ssr ≥ 0.10: setAll(cookies, headers) — заголовки
// Cache-Control/Expires/Pragma копіюємо у відповідь, щоб CDN не кешував auth-відповіді.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { guestRoute } from "@/lib/guest-route";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Між createServerClient і getClaims() не додавайте жодного коду:
  // інакше користувачів може випадково «розлогінювати».
  // getClaims() перевіряє підпис JWT; getSession() для авторизації НЕ використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    const route = guestRoute(request.nextUrl.pathname);
    if (route.kind === "redirect") {
      const url = request.nextUrl.clone();
      url.pathname = route.pathname;
      return NextResponse.redirect(url);
    }
    if (route.kind === "rewrite") {
      // Лендінг за адресою «/»: rewrite, а не redirect. Cookie сесії (зокрема очищені) і заголовки проти кешування
      // з setAll — як у supabaseResponse, щоб CDN не закешував відповідь із Set-Cookie.
      const url = request.nextUrl.clone();
      url.pathname = route.pathname;
      const response = NextResponse.rewrite(url, { request });
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
      for (const header of ["cache-control", "expires", "pragma"]) {
        const value = supabaseResponse.headers.get(header);
        if (value) response.headers.set(header, value);
      }
      return response;
    }
  }

  // Повертаємо саме supabaseResponse: у ньому оновлені cookie сесії.
  return supabaseResponse;
}
