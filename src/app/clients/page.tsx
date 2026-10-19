import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { AddClientForm } from "./add-client-form";

// Клієнти практики: список і створення картки (admin, scheduler). AC-HOLD-10 … AC-HOLD-16.
export default async function ClientsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  if (!isStaff(user.role)) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm">Only schedulers and admins can manage clients.</p>
        <Link href="/" className="text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  // RLS (clients_select_staff): admin і scheduler бачать усіх клієнтів.
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, email")
    .order("full_name");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/" className="text-sm underline">
          Home
        </Link>
      </div>

      <section aria-labelledby="new-client" className="flex flex-col gap-4">
        <h2 id="new-client" className="text-lg font-medium">
          New client
        </h2>
        <AddClientForm />
      </section>

      <section aria-labelledby="all-clients" className="flex flex-col gap-2">
        <h2 id="all-clients" className="text-lg font-medium">
          All clients
        </h2>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            Could not load clients. Try again later.
          </p>
        ) : clients && clients.length > 0 ? (
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800" data-testid="client-list">
            {clients.map((client) => (
              <li key={client.id} className="flex justify-between gap-4 py-2">
                <span>{client.full_name}</span>
                <span className="text-zinc-500">{client.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No clients yet.</p>
        )}
      </section>
    </main>
  );
}
