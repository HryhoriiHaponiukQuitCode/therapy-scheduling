// Повідомлення про результат server action (useActionState): помилка — alert, успіх — status.
// Спільне для форм клієнтів, утримання й підтвердження, щоб доступність і вигляд не розходилися.
// aria-live явно не задаємо: alert — неявно assertive, status — polite. Елемент тримаємо змонтованим,
// щоб програми читання з екрана оголошували зміну тексту.
export type ActionResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export function ActionMessage({ state }: { state: ActionResult }) {
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`min-h-5 text-sm ${isError ? "text-red-600" : "text-green-700"}`}
    >
      {state.status === "idle" ? "" : state.message}
    </p>
  );
}
