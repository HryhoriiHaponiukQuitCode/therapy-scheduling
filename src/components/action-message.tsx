// Повідомлення про результат server action (useActionState): помилка — alert, успіх — status.
// Спільне для форм клієнтів, утримання й підтвердження, щоб доступність і вигляд не розходилися.
export type ActionResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export function ActionMessage({ state }: { state: ActionResult }) {
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={`min-h-5 text-sm ${isError ? "text-red-600" : "text-green-700"}`}
    >
      {state.status === "idle" ? "" : state.message}
    </p>
  );
}
