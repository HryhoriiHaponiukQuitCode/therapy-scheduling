// НЕГАТИВНІ КОНТРОЛІ UAT — навмисно хибні очікування, щоб показати, що конвеєр UAT уміє падати.
// Не AC-тести: назви починаються з NC-, а не з AC ID, тож ac:coverage їх не рахує. У звичайному прогоні їх немає
// (проєкт chromium має grepInvert @negative-control); запуск: npm run uat:nc. Лише читання: безпечно на проді.
// Що мають показати:
//   NC-1 — у тесті неправильний очікуваний текст → перевірка падає → FAIL, хоч би що сказав агент (R1);
//   NC-2 — текст «Тоді» у вимозі «уточнено», а тест і застосунок ні → перевірки зелені, агент звіряє кадр із НОВИМ
//          текстом і не погоджується → NEEDS-HUMAN (R3).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/therapist1.json" });

const CLAUSE =
  "форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася";
const WRONG_MESSAGE = "Only admins can create client cards.";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-CARD-06, навмисно хибне очікування в тесті: інший текст повідомлення)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-CARD-06" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given("therapist1 увійшов у застосунок", async () => {
      await page.goto("/");
    });
    await when("він відкриває форму нової картки клієнта за прямим посиланням", async () => {
      await page.goto("/clients/new");
    });
    await thenStep(
      page,
      { clause: CLAUSE, visible: ["повідомлення «Only schedulers and admins can create client cards.»"] },
      async () => {
        await expect(page.getByTestId("access-denied")).toHaveText(WRONG_MESSAGE, { timeout: 5_000 });
      },
    );
  },
);

test(
  "NC-2 (AC-CARD-06, текст «Тоді» у вимозі уточнено, тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-CARD-06" },
      { type: "case", description: "NC-2" },
      {
        type: "ac-text",
        description:
          "AC-CARD-06: Дано therapist1 увійшов у застосунок. Коли він відкриває форму нової картки клієнта за прямим посиланням. Тоді форму не показано, therapist1 одразу бачить повідомлення «Ask a scheduler to create the client card.», і кількість карток клієнтів не змінилася.",
      },
    ],
  },
  async ({ page }) => {
    await given("therapist1 увійшов у застосунок", async () => {
      await page.goto("/");
    });
    await when("він відкриває форму нової картки клієнта за прямим посиланням", async () => {
      await page.goto("/clients/new");
    });
    await thenStep(
      page,
      { clause: CLAUSE, visible: ["повідомлення «Only schedulers and admins can create client cards.»"] },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === "/clients/new");
        await expect(page.getByTestId("access-denied")).toHaveText("Only schedulers and admins can create client cards.");
      },
    );
  },
);
