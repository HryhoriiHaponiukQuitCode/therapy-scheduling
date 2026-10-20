import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
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
      <div className="flex w-full max-w-[400px] flex-col gap-4">
        <div className="flex items-center gap-2.5 px-1 text-[15px] font-semibold tracking-[-0.01em]">
          <BrandMark />
          Practice scheduling
        </div>
        <Card id="login-title" title="Вхід" headingLevel={1}>
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
        </Card>
      </div>
    </main>
  );
}
