import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { APP_ROLES } from "@/lib/roles";
import { isClientId, missingCardMessage, NOT_PROVIDED } from "@/lib/clients";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

// Картка клієнта з усіма даними анкети (AC-CARD-01, AC-CARD-04, AC-CARD-10). Що видно — вирішує RLS: планувальник і
// адміністратор — будь-яку картку, терапевт — лише свого клієнта. Немає рядка → для терапевта «You don't have access
// to this client.» і для чужої, і для неіснуючої картки (AC-CARD-05, 08, 14, 16); для інших — «doesn't exist».
export default async function ClientCardPage({ params }: PageProps<"/clients/[id]">) {
  const access = await getPageAccess(APP_ROLES);
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="Client" message={access.message} />;
  const role = access.user.role;

  const { id } = await params;
  const missing = <AccessDenied title="Client" message={missingCardMessage(role)} />;
  if (!isClientId(id)) return missing;

  const supabase = await createClient();
  const { data: card, error } = await supabase
    .from("clients")
    .select("full_name, client_type, birth_date, session_language, email, guardian_name, guardian_email")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <>
        <PageHeader title="Client" />
        <ActionMessage state={{ status: "error", message: "Could not load the client card. Try again later." }} />
      </>
    );
  }
  if (!card) return missing;

  const child = card.client_type === "child";
  const rows: [string, string | null][] = [
    ["Client type", child ? "Child" : "Adult"],
    ["Date of birth", card.birth_date],
    ["Session language", card.session_language],
    ...(child
      ? ([
          ["Guardian name", card.guardian_name],
          ["Guardian email", card.guardian_email],
        ] as [string, string | null][])
      : ([["Email", card.email]] as [string, string | null][])),
  ];

  return (
    <>
      <PageHeader title={card.full_name} description="Client card" />
      <Panel
        id="client-card"
        title="Intake form"
        actions={
          <Link href="/clients" className={buttonClass("glass")}>
            All clients
          </Link>
        }
        className="max-w-[640px]"
      >
        <dl className="m-0 grid grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-x-6 gap-y-4" data-testid="client-card">
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-[13px] font-semibold text-muted-foreground">{label}</dt>
              <dd className={`m-0 break-all ${value ? "font-semibold" : "text-muted-foreground"}`}>
                {value ?? NOT_PROVIDED}
              </dd>
            </Fragment>
          ))}
        </dl>
      </Panel>
    </>
  );
}
