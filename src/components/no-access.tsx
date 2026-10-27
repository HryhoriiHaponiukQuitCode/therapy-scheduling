import { signOut } from "@/app/login/actions";
import { NO_ROLE_MESSAGE } from "@/lib/roles";
import { BrandMark } from "./icons";
import { SubmitButton } from "./ui/submit-button";

// Користувач увійшов, але ролі не має (AC-CARD-11): лише повідомлення і «Sign out» — без смуги, посилань і даних.
// Вигляд — як сторінка входу: одна скляна панель по центру (DESIGN.md, розділ 6, «Відмова в доступі»).
export function NoAccess() {
  return (
    <main className="flex min-h-dvh w-full flex-1 items-center justify-center px-4 py-16">
      <section
        aria-labelledby="no-access-title"
        className="glass flex w-full max-w-[440px] flex-col gap-6 rounded-xl p-8 max-[760px]:rounded-lg max-[760px]:p-6"
      >
        <div className="flex items-center gap-3 text-[15px] font-semibold tracking-[-0.01em]">
          <BrandMark size={40} />
          Practice scheduling
        </div>
        <h1 id="no-access-title" className="m-0 text-[22px] leading-7 font-medium">
          No access
        </h1>
        <p role="status" className="m-0" data-testid="no-access-message">
          {NO_ROLE_MESSAGE}
        </p>
        <form action={signOut}>
          <SubmitButton variant="primary" className="w-full">
            Sign out
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
