import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "glass";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-navy text-on-navy shadow-navy hover:brightness-110",
  secondary: "border-navy bg-glass-hi text-navy hover:bg-glass",
  glass: "border-glass-edge bg-glass-hi text-ink shadow-glass hover:bg-glass",
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
