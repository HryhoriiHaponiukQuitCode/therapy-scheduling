import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-btn text-on-btn hover:bg-btn-hover",
  secondary: "border-border-strong bg-surface text-ink hover:bg-subtle",
  ghost: "bg-transparent px-2 text-ink underline underline-offset-[3px] hover:bg-subtle",
};

export const buttonClass = (variant: ButtonVariant = "primary", extra = "") =>
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-[18px] text-sm leading-none font-medium disabled:cursor-not-allowed aria-busy:cursor-progress aria-busy:opacity-70 ${VARIANT[variant]} ${extra}`;

// Дві кнопки на все (розділ 1): primary — чорна, secondary — біла з межею; ghost — для дрібних дій (DatePicker).
// pending: спінер, aria-busy і disabled; решта пропсів <button> (form, name, value) — як є.
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
