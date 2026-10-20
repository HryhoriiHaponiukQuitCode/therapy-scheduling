import { ErrorIcon, SuccessIcon } from "./icons";

// Повідомлення про результат server action (useActionState): помилка — alert, успіх — status.
// Спільне для форм клієнтів, утримання й підтвердження, щоб доступність і вигляд не розходилися.
// aria-live явно не задаємо: alert — неявно assertive, status — polite. Елемент тримаємо змонтованим,
// щоб програми читання з екрана оголошували зміну тексту.
// Вигляд — плашка з іконкою: success на success-bg, error на error-bg (design-system.md, розділ 4).
export type ActionResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export function ActionMessage({ state }: { state: ActionResult }) {
  const isError = state.status === "error";
  const shown = state.status !== "idle";
  const tone = isError ? "bg-error-bg text-error" : "bg-success-bg text-success";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={shown ? `m-0 flex items-start gap-2.5 rounded-md px-3.5 py-3 font-medium ${tone}` : "m-0"}
    >
      {shown ? (
        <>
          {isError ? (
            <ErrorIcon className="mt-px size-[18px] flex-none" />
          ) : (
            <SuccessIcon className="mt-px size-[18px] flex-none" />
          )}
          <span>{state.message}</span>
        </>
      ) : null}
    </p>
  );
}
