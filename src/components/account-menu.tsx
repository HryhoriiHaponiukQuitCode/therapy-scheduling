"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/login/actions";
import { Avatar } from "./ui/avatar";
import { SignOutIcon } from "./icons";

// Пігулка акаунта праворуч у шапці контенту (розділ 3): email 600, роль muted-foreground, коло з першою літерою.
// Це кнопка меню акаунта (WAI-ARIA menu button): клік, Enter, Space чи ↓ відкривають меню з «Sign out» (наявна форма
// signOut), фокус — на першому пункті; Esc закриває й повертає фокус на пігулку, клік поза меню чи Tab — закриває.
// До 760px email і роль лишаються лише для скрінрідера (sr-only), видно коло.
export function AccountMenu({ email, role }: { email: string | null; role: string | null }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative col-start-2 row-start-1 col-span-1! w-fit self-start justify-self-end">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKey}
        className="glass flex cursor-pointer items-center gap-3 rounded-full py-2 pr-2 pl-[18px] text-left text-foreground transition-[background-color] duration-150 hover:bg-accent max-[760px]:p-1"
      >
        <span className="min-w-0 max-[760px]:sr-only">
          <span className="block truncate text-[13px] leading-4 font-semibold">{email ?? "No email"}</span>
          <span className="text-xs text-muted-foreground">{role ?? "No role"}</span>
        </span>
        <Avatar name={email ?? ""} className="size-11 text-sm" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="absolute top-[calc(100%+8px)] right-0 z-40 min-w-[200px] rounded-lg border border-card-border bg-popover p-1.5 text-popover-foreground shadow-pop"
        >
          <form action={signOut}>
            <SignOutItem itemRef={itemRef} />
          </form>
        </div>
      ) : null}
    </div>
  );
}

// Пункт меню «Sign out»: на час дії — спінер, aria-busy і disabled.
function SignOutItem({ itemRef }: { itemRef: RefObject<HTMLButtonElement | null> }) {
  const { pending } = useFormStatus();
  return (
    <button
      ref={itemRef}
      type="submit"
      role="menuitem"
      disabled={pending}
      aria-busy={pending || undefined}
      className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm font-semibold text-foreground hover:bg-foreground/[0.07] focus-visible:bg-foreground/[0.07] focus-visible:outline-offset-0 disabled:cursor-progress"
    >
      {pending ? (
        <span
          aria-hidden
          className="size-[18px] animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : (
        <SignOutIcon className="size-[18px]" />
      )}
      Sign out
    </button>
  );
}
