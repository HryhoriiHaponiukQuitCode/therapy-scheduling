// Куди вести запит без входу (src/lib/supabase/proxy.ts): гість на «/» бачить лендінг /welcome за тією самою адресою,
// публічні сторінки відкриваються як є, решта — перенаправлення на /login.
// /api/health — публічна перевірка проду (D0 WS8): smoke і перевірка курсу читають її без входу.
export const PUBLIC_PATHS = ["/login", "/auth", "/welcome", "/api/health"];

export type GuestRoute =
  | { kind: "next" }
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; pathname: string };

export function guestRoute(pathname: string): GuestRoute {
  if (pathname === "/") return { kind: "rewrite", pathname: "/welcome" };
  // Сама адреса або вкладена в неї (/auth/callback), але не «схожа» (/welcome-private, /login-x).
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return { kind: "next" };
  return { kind: "redirect", pathname: "/login" };
}
