import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { APP_ROLES, isStaff } from "@/lib/roles";
import { childGuardianLabel, emptyClientsMessage } from "@/lib/clients";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { NoAccess } from "@/components/no-access";
import { UsersIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/button";

// Клієнти практики: admin і scheduler — усі картки й перехід до нової (AC-CARD-10, AC-CARD-15);
// therapist — лише свої (AC-CARD-04, AC-CARD-08, AC-CARD-09, AC-CARD-14). Хто чий — вирішує RLS
// (clients_select_staff, clients_select_own_therapist), сторінка лише вибирає тексти й дії за роллю.
export default async function ClientsPage() {
  const access = await getPageAccess(APP_ROLES);
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="Clients" message={access.message} />;
  const role = access.user.role;
  const staff = isStaff(role);

  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, email, client_type, guardian_email")
    .order("full_name");

  return (
    <>
      <PageHeader title="Clients" description={staff ? undefined : "Clients you have holds or sessions with."} />

      <Panel
        id="all-clients"
        title={staff ? "All clients" : "My clients"}
        actions={
          staff ? (
            <Link href="/clients/new" className={buttonClass("primary")}>
              New client
            </Link>
          ) : null
        }
      >
        {error ? (
          <ActionMessage state={{ status: "error", message: "Could not load clients. Try again later." }} />
        ) : clients && clients.length > 0 ? (
          <ul role="list" className="m-0 flex list-none flex-col p-0" data-testid="client-list">
            {clients.map((client) => (
              <li key={client.id} className="border-t border-border first:border-t-0">
                <Link
                  href={`/clients/${client.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <Avatar name={client.full_name} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{client.full_name}</span>
                    {/* Дитина — без власного email: показуємо email опікуна (AC-CARD-02). */}
                    <span className="block text-[13px] break-all text-muted-foreground">
                      {client.client_type === "child"
                        ? childGuardianLabel(client.guardian_email ?? "")
                        : `Adult · ${client.email ?? ""}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<UsersIcon />} data-testid="no-clients">
            {emptyClientsMessage(role)}
          </EmptyState>
        )}
      </Panel>
    </>
  );
}
