import { ErrorIcon, InfoIcon, SuccessIcon } from "./icons";

// Повідомлення про результат server action (useActionState): помилка — alert, успіх і довідка — status.
// Спільне для форм клієнтів, утримання й підтвердження, щоб доступність і вигляд не розходилися.
// aria-live явно не задаємо: alert — неявно assertive, status — polite. Елемент тримаємо змонтованим,
// щоб програми читання з екрана оголошували зміну тексту.
// Вигляд — пігулка success-surface / destructive-surface з круглою іконкою (DESIGN.md, розділ 4); info — нейтральна
// пігулка accent для стану, що не є ні помилкою, ні успіхом (чернетка, де ще бракує полів): destructive — лише для помилок.
export type ActionResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string }
  | { status: "info"; message: string };

const TONE = {
  error: "bg-destructive-surface text-destructive",
  success: "bg-success-surface text-success",
  info: "border border-card-border bg-accent text-foreground",
};
const ICON = { error: ErrorIcon, success: SuccessIcon, info: InfoIcon };

export function ActionMessage({ state }: { state: ActionResult }) {
  const isError = state.status === "error";
  const shown = state.status !== "idle";
  const tone = shown ? TONE[state.status] : "";
  const Icon = shown ? ICON[state.status] : null;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={
        shown
          ? `m-0 flex w-fit max-w-full items-center gap-2.5 rounded-[22px] py-2.5 pr-4 pl-2.5 font-semibold ${tone}`
          : "m-0"
      }
    >
      {Icon && shown ? (
        <>
          <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-accent">
            <Icon className="size-4" />
          </span>
          <span>{state.message}</span>
        </>
      ) : null}
    </p>
  );
}
