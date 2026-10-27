import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { STAFF_ROLES } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { NoAccess } from "@/components/no-access";
import { UsersIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/button";
import Link from "next/link";

// Клієнти практики: список (admin, scheduler) і перехід до нової картки /clients/new (AC-CARD-01, AC-HOLD-10).
export default async function ClientsPage() {
  // Без ролі — лише NoAccess (AC-CARD-11); список терапевта — задача 3 impl-client-cards.
  const access = await getPageAccess(STAFF_ROLES, "Only schedulers and admins can manage clients.");
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="Clients" message={access.message} />;

  const supabase = await createClient();

  // RLS (clients_select_staff): admin і scheduler бачать усіх клієнтів.
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, email, client_type, guardian_email")
    .order("full_name");

  return (
    <>
      <PageHeader title="Clients" />

      <Panel
        id="all-clients"
        title="All clients"
        actions={
          <Link href="/clients/new" className={buttonClass("primary")}>
            New client
          </Link>
        }
      >
        {error ? (
          <ActionMessage state={{ status: "error", message: "Could not load clients. Try again later." }} />
        ) : clients && clients.length > 0 ? (
          <ul role="list" className="m-0 flex list-none flex-col p-0" data-testid="client-list">
            {clients.map((client) => (
              <li key={client.id} className="flex min-h-14 items-center gap-3 border-t border-border py-2 first:border-t-0">
                <Avatar name={client.full_name} />
                <span className="min-w-0">
                  <span className="block font-semibold">{client.full_name}</span>
                  {/* Дитина — без власного email: показуємо email опікуна (AC-CARD-02). */}
                  <span className="block text-[13px] break-all text-muted-foreground">
                    {client.client_type === "child"
                      ? `Child · guardian ${client.guardian_email ?? ""}`
                      : `Adult · ${client.email ?? ""}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<UsersIcon />}>No clients yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}
