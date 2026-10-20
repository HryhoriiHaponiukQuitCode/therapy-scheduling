import { ActionMessage } from "@/components/action-message";
import { Field, Input } from "@/components/field";
import { BrandMark } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "Incorrect email or password.",
};

// Вхід без смуги: на тлі градієнта по центру одна скляна панель 400px (design-system.md, розділ 5).
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex min-h-dvh w-full flex-1 items-center justify-center px-4 py-16">
      <section
        aria-labelledby="login-title"
        className="glass flex w-full max-w-[400px] flex-col gap-6 rounded-xl p-8 max-[760px]:rounded-lg max-[760px]:p-6"
      >
        <div className="flex items-center gap-3 text-[15px] font-semibold tracking-[-0.01em]">
          <BrandMark size={40} />
          Practice scheduling
        </div>
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
    </main>
  );
}
