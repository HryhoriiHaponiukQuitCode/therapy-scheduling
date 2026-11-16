import { z } from "zod";

// Відповідь моделі для чернетки картки клієнта (зріз 4, AC-INTAKE-01…08). Модель лише ВИТЯГУЄ дані з тексту;
// тип клієнта, перевірку дати, email і «Missing: …» рахує код (src/lib/intake.ts), а не модель.
//   ok         — звернення нового клієнта; поля — що є в тексті;
//   needs_info — звернення нового клієнта, але бракує даних (код однаково рахує, яких саме);
//   refused    — текст не є зверненням одного нового клієнта або містить вказівки помічнику (AC-INTAKE-06, 07).
// Кожне поле обов'язкове, «невідоме» = null (не .optional()): строга JSON-схема вимагає всі властивості в required.
export const IntakeExtractionSchema = z.object({
  status: z.enum(["ok", "needs_info", "refused"]),
  writer_is_guardian: z
    .boolean()
    .describe("true if the text is written by an adult about their own child (the child is the new client)"),
  client_name: z.string().max(200).nullable().describe("the new client's name exactly as written, or null"),
  birth_date: z
    .string()
    .max(20)
    .nullable()
    .describe("the new client's full date of birth as YYYY-MM-DD; null if day, month or year is missing"),
  session_language: z
    .enum(["English", "Spanish"])
    .nullable()
    .describe("the language the client explicitly wants for sessions, only English or Spanish; otherwise null"),
  client_email: z.string().max(254).nullable().describe("the new client's own email exactly as written, or null"),
  guardian_name: z.string().max(200).nullable().describe("the parent's name when writer_is_guardian, else null"),
  guardian_email: z.string().max(254).nullable().describe("the parent's email when writer_is_guardian, else null"),
});

export type IntakeExtraction = z.infer<typeof IntakeExtractionSchema>;
