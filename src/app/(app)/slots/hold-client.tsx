"use client";

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Клієнт, для якого утримуємо слот, — спільний для поля «Client» (HoldSlotForm) і кнопок Hold у сітці: поки
// клієнта не вибрано, кнопки вимкнені, а причину показує підказка біля поля (DESIGN.md, «Вимкнена дія»).
// Сервер однаково перевіряє клієнта (CLIENT_UNKNOWN у holdSlot).
const HoldClientContext = createContext<{ clientId: string; setClientId: (id: string) => void }>({
  clientId: "",
  setClientId: () => {},
});

export function HoldClientProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState("");
  return <HoldClientContext.Provider value={{ clientId, setClientId }}>{children}</HoldClientContext.Provider>;
}

export const useHoldClient = () => useContext(HoldClientContext);

export function HoldButton(props: Omit<ComponentProps<typeof Button>, "disabled">) {
  const { clientId } = useHoldClient();
  return <Button {...props} disabled={!clientId} />;
}
