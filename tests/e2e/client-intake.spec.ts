// UAT за AC зрізу 4 «Планувальник отримує чернетку картки клієнта з тексту звернення й сам створює картку»
// (requirements/36-…): один AC — один test, «Тоді» — дослівно з вимоги PM, частини «Тоді» — окремими кадрами.
// AC-INTAKE-01, 03, 06 викликають модель: лише на розгорнутому застосунку (UAT_BASE_URL, ключ ANTHROPIC_API_KEY у
// Vercel), тег @model. Локальна збірка й CI ключа не мають — playwright.config.ts їх там не бере; код навколо моделі доводять офлайн-тести
// (tests/golden.test.ts, tests/intake*.test.ts). Нічого не пишуть у базу: картку не створюємо (тег @writes не потрібен).
// Ролі — з tests/e2e/auth.setup.ts (scheduler1, therapist1).
import { expect, test, type Page } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const auth = (role: "scheduler1" | "therapist1") => `playwright/.auth/${role}.json`;

const AC01_TEXT =
  "Hi, my name is Client Ten, I was born on May 14, 1990. I'd like individual sessions in English. My email is client10@example.test.";
const DRAFT_READY = "Draft ready. Check the fields and create the card.";
const REFUSED = "This text can't be used to draft a client card. Paste the client's request or fill in the form manually.";

async function requestDraft(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Client request" }).fill(text);
  await page.getByRole("button", { name: "Draft card", exact: true }).click();
}

const card = (page: Page) => page.locator("#client-card");

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.describe("планувальник", () => {
  test.use({ storageState: auth("scheduler1") });

  test(
    "AC-INTAKE-01: scheduler1 просить скласти чернетку з тексту звернення Client Ten — форма заповнена, «Draft ready. Check the fields and create the card.»",
    { tag: ["@uat", "@model"], annotation: { type: "ac", description: "AC-INTAKE-01" } },
    async ({ page }) => {
      await given("сьогодні 2026-11-13, і клієнта з email client10@example.test ще немає", async () => {
        await page.goto("/clients");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByText("client10@example.test")).toHaveCount(0);
      });

      await when("scheduler1 у формі нової картки просить скласти чернетку з тексту звернення", async () => {
        await page.goto("/clients/new");
        await requestDraft(page, AC01_TEXT);
        await expect(page.getByText(DRAFT_READY)).toBeVisible({ timeout: 30_000 });
      });

      await thenStep(
        page,
        {
          clause:
            "у формі вибрано Client type «Adult», Name — «Client Ten», Date of birth — 1990-05-14, Session language — «English», Email — client10@example.test",
          visible: ["поля форми нової картки: Adult, Client Ten, 1990-05-14, English, client10@example.test"],
        },
        async () => {
          await expect(page.getByRole("combobox", { name: "Client type" })).toContainText("Adult");
          await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Client Ten");
          await expect(page.getByLabel("Date of birth")).toHaveValue("1990-05-14");
          await expect(page.getByRole("combobox", { name: "Session language" })).toContainText("English");
          await expect(page.getByLabel("Email", { exact: true })).toHaveValue("client10@example.test");
        },
      );

      await thenStep(
        page,
        { clause: "scheduler1 бачить повідомлення «Draft ready. Check the fields and create the card.»", visible: ["повідомлення під кнопкою Draft card"] },
        async () => {
          await expect(page.getByRole("status").filter({ hasText: DRAFT_READY })).toBeVisible();
        },
      );
    },
  );

  test(
    "AC-INTAKE-03: чернетку з тексту AC-INTAKE-01 заповнено, scheduler1 не створює картку — «Client Ten» у списку клієнтів немає",
    { tag: ["@uat", "@model"], annotation: { type: "ac", description: "AC-INTAKE-03" } },
    async ({ page }) => {
      await given("чернетку за текстом з AC-INTAKE-01 заповнено у формі нової картки", async () => {
        await page.goto("/clients/new");
        await requestDraft(page, AC01_TEXT);
        await expect(page.getByText(DRAFT_READY)).toBeVisible({ timeout: 30_000 });
        await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Client Ten");
      });

      await when("scheduler1 не створює картку й відкриває список клієнтів", async () => {
        await page.goto("/clients");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      });

      await thenStep(
        page,
        {
          clause: "картки «Client Ten» у списку немає: картку створює лише сам планувальник, коли зберігає форму",
          visible: ["список клієнтів без рядка «Client Ten»"],
        },
        async () => {
          await expect(page.getByText("Client Ten", { exact: true })).toHaveCount(0);
          await expect(page.getByText("client10@example.test")).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-INTAKE-06: у формі вже введено Name «Client Fifteen», scheduler1 просить чернетку з тексту «Can you recommend a good book about anxiety?» — поля не змінено, повідомлення відмови",
    { tag: ["@uat", "@model"], annotation: { type: "ac", description: "AC-INTAKE-06" } },
    async ({ page }) => {
      await given("у формі нової картки вже введено Name «Client Fifteen»", async () => {
        await page.goto("/clients/new");
        await page.getByLabel("Name", { exact: true }).fill("Client Fifteen");
      });

      await when("scheduler1 просить скласти чернетку з тексту звернення «Can you recommend a good book about anxiety?»", async () => {
        await requestDraft(page, "Can you recommend a good book about anxiety?");
        await expect(page.getByText(REFUSED)).toBeVisible({ timeout: 30_000 });
      });

      await thenStep(
        page,
        { clause: "поля форми не змінено (Name лишається «Client Fifteen»)", visible: ["поле Name зі значенням Client Fifteen"] },
        async () => {
          await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Client Fifteen");
          await expect(card(page).getByRole("combobox", { name: "Client type" })).toContainText("Select a client type");
        },
      );

      await thenStep(
        page,
        {
          clause:
            "scheduler1 бачить повідомлення «This text can't be used to draft a client card. Paste the client's request or fill in the form manually.»",
          visible: ["повідомлення відмови під кнопкою Draft card"],
        },
        async () => {
          await expect(page.getByRole("alert").filter({ hasText: REFUSED })).toBeVisible();
        },
      );
    },
  );
});

test.describe("терапевт", () => {
  test.use({ storageState: auth("therapist1") });

  test(
    "AC-INTAKE-09: therapist1 відкриває форму нової картки за прямим посиланням — без форми й чернетки, «Only schedulers and admins can create client cards.»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-INTAKE-09" } },
    async ({ page }) => {
      await given("therapist1 увійшов у застосунок", async () => {
        await page.goto("/");
        await expect(page).not.toHaveURL(/\/login/);
      });

      await when("він відкриває форму нової картки клієнта за прямим посиланням", async () => {
        await page.goto("/clients/new");
      });

      await thenStep(
        page,
        {
          clause: "форми й можливості скласти чернетку не показано, therapist1 бачить повідомлення «Only schedulers and admins can create client cards.»",
          visible: ["повідомлення про відмову на сторінці New client без форми"],
        },
        async () => {
          await expect(page.getByText("Only schedulers and admins can create client cards.")).toBeVisible();
          await expect(page.getByRole("textbox", { name: "Client request" })).toHaveCount(0);
          await expect(page.getByRole("button", { name: "Draft card" })).toHaveCount(0);
          await expect(page.getByRole("button", { name: "Create client" })).toHaveCount(0);
        },
      );
    },
  );
});
