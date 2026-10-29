// Вхід кожної ролі один раз за прогін → playwright/.auth/<role>.json (у .gitignore: там живі cookie сесії).
// Тести ролей беруть стан через test.use({ storageState: "playwright/.auth/<role>.json" }).
// У цьому проєкті запис вимкнено (playwright.config.ts: setup — video, trace і screenshot "off"): тут вводиться пароль.
//
// Змінні з паролями (лише назви; значення — у .env.local локально або в secrets CI, ніколи в коді):
//   DEMO_USER_PASSWORD           — спільний пароль акаунтів із supabase/demo-users.json (npm run users:demo);
//   UAT_PASSWORD_<РОЛЬ>          — необов'язково: окремий пароль для ролі, напр. UAT_PASSWORD_ADMIN.
//
// Джерело: демо-репо курсу, tests/e2e/auth.setup.ts (тег ws8-03-uat). ROLES — ВАШІ: роль → адреса акаунта на проді
// (D0.5, *@example.test). therapy-scheduling: акаунти з AC зрізу 2 (supabase/demo-users.json, створені на проді
// npm run users:demo) — scheduler1 (AC-CARD-16), therapist1 (AC-CARD-05, 06, 16), therapist2 (власник клієнта, AC-CARD-05).
import { expect, test as setup } from "@playwright/test";
import { signIn } from "./support/uat";

const ROLES = {
  scheduler1: "scheduler1@example.test",
  therapist1: "therapist1@example.test",
  therapist2: "therapist2@example.test",
} as const;

for (const [role, email] of Object.entries(ROLES)) {
  setup(`вхід: ${role}`, async ({ page }) => {
    const password = process.env[`UAT_PASSWORD_${role.toUpperCase()}`] ?? process.env.DEMO_USER_PASSWORD;
    expect(password, `немає пароля для ролі ${role}: DEMO_USER_PASSWORD або UAT_PASSWORD_${role.toUpperCase()}`).toBeTruthy();
    await signIn(page, email, password!);
    // Головна показує email того, хто увійшов, у меню акаунта праворуч угорі (src/components/account-menu.tsx).
    await expect(page.getByRole("button", { name: new RegExp(email.replace(/[.]/g, "\\.")) })).toBeVisible();
    await page.context().storageState({ path: `playwright/.auth/${role}.json` });
  });
}
