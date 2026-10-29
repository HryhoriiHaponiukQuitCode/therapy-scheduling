// UAT за AC зрізу 2 «Планувальник заповнює картку клієнта» (requirements/19-…): відмови й стан інтерфейсу картки
// клієнта. Лише читання: жодна дія нічого не пише в базу, тож безпечно на спільному проді.
// Ролі — з tests/e2e/auth.setup.ts (scheduler1, therapist1, therapist2). Тексти «Тоді» — дослівно з вимог PM.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const NO_ACCESS = "You don't have access to this client.";
const NOT_FOUND = "This client card doesn't exist.";
const FORBIDDEN_NEW = "Only schedulers and admins can create client cards.";
// Посилання на картку, якої немає: правильний вигляд id, але такого рядка в базі немає.
const MISSING_CARD = "/clients/00000000-0000-4000-8000-000000000000";

const auth = (role: "scheduler1" | "therapist1" | "therapist2") => `playwright/.auth/${role}.json`;

/** Окрема сесія іншої ролі (для «Дано» і перевірок «що не змінилося»); закрити після використання. */
async function sessionOf(browser: Browser, role: "scheduler1" | "therapist1" | "therapist2") {
  const context = await browser.newContext({ storageState: auth(role) });
  return { context, page: await context.newPage() };
}

/** Посилання на картки зі списку /clients того, хто увійшов. */
async function cardLinks(page: Page): Promise<string[]> {
  await page.goto("/clients");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return page.getByTestId("client-list").getByRole("link").evaluateAll((links) =>
    links.map((a) => new URL((a as HTMLAnchorElement).href).pathname),
  );
}

/** Усі адреси @example.test, які видно на сторінці. */
async function visibleEmails(page: Page): Promise<string[]> {
  const text = await page.locator("main").innerText();
  return [...new Set(text.match(/[\w.+-]+@example\.test/gi) ?? [])];
}

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.describe("терапевт", () => {
  test.use({ storageState: auth("therapist1") });

  test(
    "AC-CARD-05: therapist1 відкриває картку клієнта therapist2 за прямим посиланням — «You don't have access to this client.», даних немає, картка не змінилась",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-05" } },
    async ({ page, browser }) => {
      let link = "";
      let before = "";
      await given("клієнт — свій лише для therapist2 (є в списку therapist2, немає в списку therapist1)", async () => {
        const owner = await sessionOf(browser, "therapist2");
        const ownerLinks = await cardLinks(owner.page);
        const mine = new Set(await cardLinks(page));
        link = ownerLinks.find((href) => !mine.has(href)) ?? "";
        expect(link, "у therapist2 на проді має бути клієнт, якого немає в therapist1").not.toBe("");
        await owner.page.goto(link);
        before = await owner.page.getByTestId("client-card").innerText();
        await owner.context.close();
      });

      await when("therapist1 відкриває картку цього клієнта за прямим посиланням", async () => {
        await page.goto(link);
      });

      await thenStep(
        page,
        {
          clause:
            "therapist1 бачить повідомлення «You don't have access to this client.», жодних даних client9 не показано, і картка client9 не змінилася",
          visible: ["повідомлення «You don't have access to this client.»"],
          hidden: [
            "жодних даних клієнта: на сторінці немає картки (data-testid=client-card) і жодного email, крім власного therapist1",
            "картка не змінилася: therapist2 після спроби бачить ту саму картку слово в слово",
          ],
        },
        async () => {
          await expect(page.getByTestId("access-denied")).toHaveText(NO_ACCESS);
          await expect(page.getByTestId("client-card")).toHaveCount(0);
          expect(await visibleEmails(page)).toEqual(["therapist1@example.test"]);
          const owner = await sessionOf(browser, "therapist2");
          await owner.page.goto(link);
          // Обидва знімки картки — innerText: toHaveText порівнює з textContent (без переносів), і на Linux у CI
          // innerText і textContent тієї самої картки відрізняються.
          await expect(owner.page.getByTestId("client-card")).toBeVisible();
          expect(await owner.page.getByTestId("client-card").innerText()).toBe(before);
          await owner.context.close();
        },
      );
    },
  );

  test(
    "AC-CARD-06: therapist1 відкриває форму нової картки за прямим посиланням — форми немає, «Only schedulers and admins can create client cards.», кількість карток та сама",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-06" } },
    async ({ page, browser }) => {
      let cardsBefore = 0;
      await given("therapist1 увійшов у застосунок", async () => {
        const staff = await sessionOf(browser, "scheduler1");
        cardsBefore = (await cardLinks(staff.page)).length;
        await staff.context.close();
        await page.goto("/");
        await expect(page.getByRole("button", { name: /therapist1@example\.test/ })).toBeVisible();
      });

      await when("він відкриває форму нової картки клієнта за прямим посиланням", async () => {
        await page.goto("/clients/new");
      });

      await thenStep(
        page,
        {
          clause:
            "форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася",
          visible: [
            "повідомлення «Only schedulers and admins can create client cards.»",
            "форми нової картки немає: жодного поля чи кнопки створення",
          ],
          hidden: ["кількість карток клієнтів не змінилася: scheduler1 бачить у списку стільки ж карток, як до спроби"],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === "/clients/new");
          await expect(page.getByTestId("access-denied")).toHaveText(FORBIDDEN_NEW);
          // Поля форми картки (src/app/(app)/clients/new/client-card-form.tsx) — жодного.
          await expect(page.getByLabel("Client type")).toHaveCount(0);
          await expect(page.getByLabel("Session language")).toHaveCount(0);
          await expect(page.locator("main").getByRole("textbox")).toHaveCount(0);
          const staff = await sessionOf(browser, "scheduler1");
          expect(await cardLinks(staff.page)).toHaveLength(cardsBefore);
          await staff.context.close();
        },
      );
    },
  );
});

test.describe("посилання на картку, якої немає", () => {
  test.use({ storageState: auth("scheduler1") });

  test(
    "AC-CARD-16: scheduler1, а потім therapist1 відкривають посилання на картку, якої немає — «This client card doesn't exist.» і «You don't have access to this client.», даних клієнтів немає",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-16" } },
    async ({ page, browser }) => {
      await given("картки клієнта, на яку веде посилання, не існує", async () => {
        // Посилання має вигляд справжнього (UUID); такої картки немає навіть для планувальника, який бачить усі.
        expect(await cardLinks(page)).not.toContain(MISSING_CARD);
      });

      await when("scheduler1 відкриває це посилання", async () => {
        await page.goto(MISSING_CARD);
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 бачить повідомлення «This client card doesn't exist.» і не бачить жодних даних клієнтів",
          visible: ["повідомлення «This client card doesn't exist.»"],
          hidden: ["жодних даних клієнтів: немає картки (data-testid=client-card) і жодного email, крім власного scheduler1"],
        },
        async () => {
          await expect(page.getByTestId("access-denied")).toHaveText(NOT_FOUND);
          await expect(page.getByTestId("client-card")).toHaveCount(0);
          expect(await visibleEmails(page)).toEqual(["scheduler1@example.test"]);
        },
      );

      const therapist = await sessionOf(browser, "therapist1");
      await when("потім therapist1 відкриває це саме посилання", async () => {
        await therapist.page.goto(MISSING_CARD);
      });

      await thenStep(
        therapist.page,
        {
          clause: "therapist1 бачить повідомлення «You don't have access to this client.» і не бачить жодних даних клієнтів",
          visible: ["повідомлення «You don't have access to this client.»"],
          hidden: ["жодних даних клієнтів: немає картки (data-testid=client-card) і жодного email, крім власного therapist1"],
        },
        async () => {
          await expect(therapist.page.getByTestId("access-denied")).toHaveText(NO_ACCESS);
          await expect(therapist.page.getByTestId("client-card")).toHaveCount(0);
          expect(await visibleEmails(therapist.page)).toEqual(["therapist1@example.test"]);
        },
      );
      await therapist.context.close();
    },
  );
});
