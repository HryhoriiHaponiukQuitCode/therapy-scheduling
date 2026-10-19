// Картка клієнта зрізу 1: ім'я та email (openspec/specs/clients/spec.md).
// Тексти повідомлень — дослівно з вимог PM; та сама перевірка формату email є в constraint
// clients_email_format (міграція 20261019102511_roles_and_clients.sql).

export const CLIENT_INVALID_MESSAGE = "Enter the client's name and a valid email.";
export const CLIENT_DUPLICATE_MESSAGE = "A client with this email already exists.";
export const CLIENT_FORBIDDEN_MESSAGE = "Only schedulers and admins can create clients.";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Ті самі межі, що clients_full_name_length і clients_email_length у міграції.
export const CLIENT_NAME_MAX = 200;
export const CLIENT_EMAIL_MAX = 254;

export type ClientInput = { fullName: string; email: string };

export type ClientValidation =
  | { ok: true; value: ClientInput }
  | { ok: false; message: string };

// AC-HOLD-11 (порожнє ім'я) і AC-HOLD-15 (email без @) — до запиту в базу.
export function validateClient(fullName: unknown, email: unknown): ClientValidation {
  const name = typeof fullName === "string" ? fullName.trim() : "";
  const address = typeof email === "string" ? email.trim() : "";

  if (
    !name ||
    name.length > CLIENT_NAME_MAX ||
    address.length > CLIENT_EMAIL_MAX ||
    !EMAIL_PATTERN.test(address)
  ) {
    return { ok: false, message: CLIENT_INVALID_MESSAGE };
  }
  return { ok: true, value: { fullName: name, email: address } };
}

// Коди Postgres, які повертає insert у clients.
const UNIQUE_VIOLATION = "23505"; // clients_email_lower_key — AC-HOLD-16
const CHECK_VIOLATION = "23514"; // clients_full_name_* / clients_email_*
const INSUFFICIENT_PRIVILEGE = "42501"; // RLS clients_insert_staff

export function clientInsertErrorMessage(code: string | undefined): string {
  if (code === UNIQUE_VIOLATION) return CLIENT_DUPLICATE_MESSAGE;
  if (code === CHECK_VIOLATION) return CLIENT_INVALID_MESSAGE;
  if (code === INSUFFICIENT_PRIVILEGE) return CLIENT_FORBIDDEN_MESSAGE;
  return "Could not create the client. Try again.";
}
