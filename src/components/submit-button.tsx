"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

// Кнопка відправки форми з server action без useActionState (вхід, «Вийти»): поки дія виконується,
// Button показує спінер, aria-busy і disabled — видно, що клік спрацював, і немає повторної відправки.
export function SubmitButton(props: Omit<ComponentProps<typeof Button>, "type" | "pending">) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" pending={pending} />;
}
