import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/button";
import { Field, Input } from "@/components/field";
import { BrandMark } from "@/components/icons";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Вкажіть email і пароль.",
  invalid: "Невірний email або пароль.",
};

// Вхід без бічної панелі: одна картка 400px по центру сторінки (design-system.md, розділ 5).
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex min-h-dvh w-full flex-1 items-center justify-center bg-page px-4 py-16">
      <div className="flex w-full max-w-[400px] flex-col gap-6 rounded-lg border border-border bg-surface p-7 shadow-card max-[720px]:p-5">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
          <BrandMark />
          Practice scheduling
        </div>
        <h1 className="m-0 text-[26px] leading-8 font-semibold tracking-[-0.02em]">Вхід</h1>
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
          <Field label="Пароль" htmlFor="login-password">
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
          <Button type="submit" variant="primary" className="w-full">
            Увійти
          </Button>
        </form>
      </div>
    </main>
  );
}
