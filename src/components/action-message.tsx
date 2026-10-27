import { ErrorIcon, SuccessIcon } from "./icons";

// Повідомлення про результат server action (useActionState): помилка — alert, успіх — status.
// Спільне для форм клієнтів, утримання й підтвердження, щоб доступність і вигляд не розходилися.
// aria-live явно не задаємо: alert — неявно assertive, status — polite. Елемент тримаємо змонтованим,
// щоб програми читання з екрана оголошували зміну тексту.
// Вигляд — пігулка success-surface / destructive-surface з круглою іконкою (DESIGN.md, розділ 4).
export type ActionResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export function ActionMessage({ state }: { state: ActionResult }) {
  const isError = state.status === "error";
  const shown = state.status !== "idle";
  const tone = isError ? "bg-destructive-surface text-destructive" : "bg-success-surface text-success";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={
        shown
          ? `m-0 flex w-fit max-w-full items-center gap-2.5 rounded-[22px] py-2.5 pr-4 pl-2.5 font-semibold ${tone}`
          : "m-0"
      }
    >
      {shown ? (
        <>
          <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-accent">
            {isError ? <ErrorIcon className="size-4" /> : <SuccessIcon className="size-4" />}
          </span>
          <span>{state.message}</span>
        </>
      ) : null}
    </p>
  );
}
