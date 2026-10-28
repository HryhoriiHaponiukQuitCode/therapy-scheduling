import { signOut } from "@/app/login/actions";
import { NO_ROLE_MESSAGE } from "@/lib/roles";
import { StandalonePanel } from "./standalone-panel";
import { SubmitButton } from "./ui/submit-button";

// Користувач увійшов, але ролі не має (AC-CARD-11): лише повідомлення і «Sign out» — без смуги, посилань і даних.
// Вигляд — окрема скляна панель (StandalonePanel); DESIGN.md, розділ 6, «Відмова в доступі».
export function NoAccess() {
  return (
    <StandalonePanel labelledBy="no-access-title">
      <h1 id="no-access-title" className="m-0 text-[22px] leading-7 font-medium">
        No access
      </h1>
      <p className="m-0" data-testid="no-access-message">
        {NO_ROLE_MESSAGE}
      </p>
      <form action={signOut}>
        <SubmitButton variant="primary" className="w-full">
          Sign out
        </SubmitButton>
      </form>
    </StandalonePanel>
  );
}
