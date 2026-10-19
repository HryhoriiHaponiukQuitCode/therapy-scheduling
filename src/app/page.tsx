import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { signOut } from "./login/actions";

// Головна сторінка шаблону: хто увійшов і з якою роллю (з таблиці profiles).
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
export default async function Home() {
  const supabase = await createClient();

  // getClaims() + власний профіль (RLS) — у getCurrentUser. getSession() для авторизації не використовуємо.
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Проєкт команди</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Email</dt>
        <dd data-testid="user-email">{user.email ?? "—"}</dd>
        <dt className="text-zinc-500">Роль</dt>
        <dd data-testid="user-role">{user.role ?? "профіль не знайдено"}</dd>
      </dl>
      {isStaff(user.role) ? (
        <nav aria-label="Main" className="flex gap-4 text-sm">
          <Link href="/clients" className="underline">
            Clients
          </Link>
          <Link href="/slots" className="underline">
            Slots
          </Link>
        </nav>
      ) : null}
      {user.role === "therapist" ? (
        <nav aria-label="Main" className="flex gap-4 text-sm">
          <Link href="/my-schedule" className="underline">
            My schedule
          </Link>
        </nav>
      ) : null}
      <form action={signOut}>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Вийти
        </button>
      </form>
    </main>
  );
}
