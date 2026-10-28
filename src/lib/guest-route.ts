// Куди вести запит без входу (src/lib/supabase/proxy.ts): гість на «/» бачить лендінг /welcome за тією самою адресою,
// публічні сторінки відкриваються як є, решта — перенаправлення на /login.
export const PUBLIC_PATHS = ["/login", "/auth", "/welcome"];

export type GuestRoute =
  | { kind: "next" }
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; pathname: string };

export function guestRoute(pathname: string): GuestRoute {
  if (pathname === "/") return { kind: "rewrite", pathname: "/welcome" };
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return { kind: "next" };
  return { kind: "redirect", pathname: "/login" };
}
