import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/request-user";
import { isStaff } from "@/lib/roles";
import { ActionMessage } from "@/components/action-message";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { UserIcon, UsersIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { AddClientForm } from "./add-client-form";

// Клієнти практики: список і створення картки (admin, scheduler). AC-HOLD-10 … AC-HOLD-16.
export default async function ClientsPage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) {
    redirect("/login");
  }

  if (!isStaff(user.role)) {
    return (
      <>
        <PageHeader title="Clients" />
        <p className="m-0">Only schedulers and admins can manage clients.</p>
      </>
    );
  }

  // RLS (clients_select_staff): admin і scheduler бачать усіх клієнтів.
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, email")
    .order("full_name");

  const th = "border-b border-border px-3 py-2.5 text-left text-xs leading-4 font-semibold text-muted";
  const td = "border-b border-border px-3 py-3 align-middle";

  return (
    <>
      <PageHeader title="Clients" />

      <Card id="new-client" title="New client" icon={<UserIcon />}>
        <AddClientForm />
      </Card>

      <Card id="all-clients" title="All clients" icon={<UsersIcon />}>
        {error ? (
          <ActionMessage state={{ status: "error", message: "Could not load clients. Try again later." }} />
        ) : clients && clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" data-testid="client-list">
              <thead>
                <tr>
                  <th scope="col" className={th}>
                    Name
                  </th>
                  <th scope="col" className={th}>
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className={td}>{client.full_name}</td>
                    <td className={`${td} break-all text-muted`}>{client.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<UsersIcon />}>No clients yet.</EmptyState>
        )}
      </Card>
    </>
  );
}
