import { getPageAccess } from "@/lib/request-user";
import { CLIENT_FORBIDDEN_MESSAGE } from "@/lib/clients";
import { STAFF_ROLES } from "@/lib/roles";
import { practiceDate } from "@/lib/slots";
import { AccessDenied } from "@/components/access-denied";
import { NoAccess } from "@/components/no-access";
import { ClientCardForm } from "./client-card-form";
import { NewClientShell } from "./shell";

// Нова картка клієнта з анкети (admin, scheduler). Терапевт форми не бачить навіть за прямим посиланням —
// одразу відмова (AC-CARD-06); спробу в обхід сторінки відхиляє дія createClientCard і RLS clients_insert_staff.
export default async function NewClientPage() {
  const access = await getPageAccess(STAFF_ROLES, CLIENT_FORBIDDEN_MESSAGE);
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="New client" message={access.message} />;

  return (
    <NewClientShell>
      <ClientCardForm today={practiceDate(new Date())} />
    </NewClientShell>
  );
}
