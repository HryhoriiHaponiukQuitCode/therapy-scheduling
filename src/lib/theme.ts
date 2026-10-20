// Тема інтерфейсу (design-system.md, розділ 2): за замовчуванням світла; темну вмикає перемикач у смузі.
// Вибір живе в cookie, щоб сервер одразу віддав <html data-theme> без спалаху. Без next/headers — модуль
// імпортує й клієнтський перемикач.
export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export function parseTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
