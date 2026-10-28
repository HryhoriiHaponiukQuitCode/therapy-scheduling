import { ActionMessage } from "@/components/action-message";
import { LoginHero } from "@/components/login-hero";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "Incorrect email or password.",
};

// Вхід без смуги (DESIGN.md, розділ 6): hero зліва (LoginHero), скляна панель форми 400px справа; до 1024px — одне
// під одним, hero зверху. Знак і назва — у hero, тож панель форми без рядка бренду.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="grid min-h-dvh w-full flex-1 gap-6 p-6 min-[1024px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] max-[760px]:gap-4 max-[760px]:p-4">
      <LoginHero />
      <div className="flex items-center justify-center py-6 max-[760px]:py-0">
        <section
          aria-labelledby="login-title"
          className="rise glass flex w-full max-w-[400px] flex-col gap-6 rounded-xl p-8 [--d:450ms] max-[760px]:rounded-lg max-[760px]:p-6"
        >
          <h1 id="login-title" className="m-0 text-[34px] leading-10 font-normal tracking-[-0.025em]">
            Sign in
          </h1>
          <form action={login} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={message ? true : undefined}
              />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={message ? true : undefined}
              />
            </Field>
            {message ? <ActionMessage state={{ status: "error", message }} /> : null}
            <SubmitButton variant="primary" className="mt-2 w-full">
              Sign in
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
