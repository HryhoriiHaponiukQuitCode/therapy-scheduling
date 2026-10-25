import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "glass";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-primary hover:brightness-110",
  secondary: "border-primary bg-accent text-primary hover:bg-card",
  glass: "border-card-border bg-accent text-foreground shadow-glass hover:bg-card",
};

export const buttonClass = (variant: ButtonVariant = "primary", extra = "") =>
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent px-5 text-sm leading-none font-semibold transition-[filter,background-color] duration-150 focus-visible:outline-offset-3 disabled:cursor-not-allowed aria-busy:cursor-progress aria-busy:opacity-70 ${VARIANT[variant]} ${extra}`;

// Усі кнопки — пігулки (розділ 1): primary — темно-синя основна дія, secondary — біла з синьою межею,
// glass — нейтральна скляна. pending: спінер, aria-busy і disabled; решта пропсів <button> (form, name, value) — як є.
export function Button({
  variant = "primary",
  pending = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; pending?: boolean }) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, className)}
    >
      {pending ? (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </button>
  );
}
