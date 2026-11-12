// UAT за AC зрізу 3 «Планувальник позначає статус перевірки страхування клієнта» (requirements/33-…): один AC — один
// test, «Тоді» — дослівно з вимоги PM (частини «Тоді» розбито по кадрах, як у AC-CARD-16).
// Дані: кожен тест створює СВОЮ картку клієнта uat-<run>-ins<NN>@example.test (секретним ключем, від імені scheduler1),
// тож усі тести пишуть у базу (@writes). Картки й утримання прибирає deleteUatClients() в afterAll і в
// cleanup.teardown.ts. Без SUPABASE_SECRET_KEY цей файл не запускаємо: --grep-invert '@writes'.
// AC-INS-05 «напряму, оминаючи сторінки»: правило доводить тест бази (tests/db/client-insurance-update.test.ts),
// тут — справжня пряма спроба therapist1 через API Supabase з його сесією і кадр «що не змінилося» у scheduler1.
// Ролі — з tests/e2e/auth.setup.ts (admin1, scheduler1, scheduler2, therapist1).
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  createUatClient,
  deleteUatClients,
  hasAdminKey,
  holdForTherapist,
  insuranceStatusOf,
  userClient,
} from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

type Role = "admin1" | "scheduler1" | "scheduler2" | "therapist1";
const auth = (role: Role) => `playwright/.auth/${role}.json`;
const RUN = process.env.UAT_RUN ?? "manual";

/**
 * Окрема сесія іншої ролі; закрити після використання — closeSession (тоді Playwright дописує відео).
 * Відео — і для цих сесій: налаштування video у playwright.config.ts пише лише сторінку фікстури page, а AC-INS-03
 * проходить цілком у сесіях admin1 і scheduler2 (у прогоні 3 його video.webm мав 1,6 КБ — порожній).
 */
async function sessionOf(browser: Browser, role: Role) {
  const context = await browser.newContext({
    storageState: auth(role),
    recordVideo: { dir: test.info().outputPath(`video-${role}`), size: { width: 1280, height: 800 } },
  });
  return { role, context, page: await context.newPage() };
}

/** Закрити сесію й прикріпити її відео до результату тесту (video-<роль>): його бере в звіт scripts/uat/pack.mjs. */
async function closeSession(session: Awaited<ReturnType<typeof sessionOf>>) {
  const video = session.page.video();
  await session.context.close();
  if (video) await test.info().attach(`video-${session.role}`, { path: await video.path(), contentType: "video/webm" });
}

async function openCard(page: Page, clientId: string, name: string) {
  await page.goto(`/clients/${clientId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

const statusLine = (page: Page) => page.getByTestId("insurance-status");

/** Позначити статус у формі картки так, як це робить людина: поле «Insurance status» → варіант → «Save». */
async function chooseAndSave(page: Page, status: "Verified" | "Not accepted" | "Private pay") {
  await page.getByRole("combobox", { name: "Insurance status" }).click();
  await page.getByRole("option", { name: status, exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
}


test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.afterAll(async () => {
  if (!hasAdminKey()) return;
  const { remaining } = await deleteUatClients();
  expect(remaining, "лишились картки клієнтів UAT").toEqual([]);
});

test.describe("планувальник і адміністратор", () => {
  test.use({ storageState: auth("scheduler1") });

  test(
    "AC-INS-01: scheduler1 відкриває картку client6, статус якої ще ніхто не позначав — «Insurance: Not set»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-01" } },
    async ({ page }) => {
      let client = { id: "", email: "", name: "" };
      await given("картку client6 створено, і статус перевірки страхування ще ніхто не позначав", async () => {
        client = await createUatClient({ suffix: "ins01", name: `Client Six ${RUN}` });
        expect(await insuranceStatusOf(client.id)).toBe("not_set");
      });

      await when("scheduler1 відкриває картку client6", async () => {
        await openCard(page, client.id, client.name);
      });

      await thenStep(
        page,
        { clause: "в картці показано «Insurance: Not set»", visible: ["рядок «Insurance: Not set» у картці клієнта"] },
        async () => {
          await expect(statusLine(page)).toHaveText("Insurance: Not set");
        },
      );
    },
  );

  test(
    "AC-INS-02: scheduler1 позначає статус «Verified» у картці client6 — «Insurance status saved.» і «Insurance: Verified», зокрема після повторного відкриття",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-02" } },
    async ({ page }) => {
      let client = { id: "", email: "", name: "" };
      await given("картка client6 показує «Insurance: Not set»", async () => {
        client = await createUatClient({ suffix: "ins02", name: `Client Six ${RUN}` });
        await openCard(page, client.id, client.name);
        await expect(statusLine(page)).toHaveText("Insurance: Not set");
      });

      await when("scheduler1 позначає статус перевірки страхування «Verified»", async () => {
        await chooseAndSave(page, "Verified");
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified»",
          visible: ["повідомлення «Insurance status saved.»", "рядок «Insurance: Verified» у картці клієнта"],
          hidden: ["у базі статус картки — verified"],
        },
        async () => {
          await expect(page.getByRole("status").filter({ hasText: "Insurance status saved." })).toBeVisible();
          await expect(statusLine(page)).toHaveText("Insurance: Verified");
          expect(await insuranceStatusOf(client.id)).toBe("verified");
        },
      );

      await when("scheduler1 відкриває картку client6 знову", async () => {
        await page.goto("/clients");
        await openCard(page, client.id, client.name);
      });

      await thenStep(
        page,
        {
          clause: "картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову",
          visible: ["рядок «Insurance: Verified» у щойно відкритій картці клієнта"],
        },
        async () => {
          await expect(statusLine(page)).toHaveText("Insurance: Verified");
        },
      );
    },
  );

  test(
    "AC-INS-03: admin1 змінює статус client7 з «Verified» на «Private pay», потім scheduler2 відкриває картку — обидва бачать «Insurance: Private pay»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-03" } },
    async ({ browser }) => {
      const admin = await sessionOf(browser, "admin1");
      const scheduler2 = await sessionOf(browser, "scheduler2");
      let client = { id: "", email: "", name: "" };
      try {
        await given("картка client7 показує «Insurance: Verified»", async () => {
          client = await createUatClient({ suffix: "ins03", name: `Client Seven ${RUN}`, insuranceStatus: "verified" });
          await openCard(admin.page, client.id, client.name);
          await expect(statusLine(admin.page)).toHaveText("Insurance: Verified");
        });

        await when("admin1 змінює статус перевірки страхування на «Private pay»", async () => {
          await chooseAndSave(admin.page, "Private pay");
          await expect(admin.page.getByRole("status").filter({ hasText: "Insurance status saved." })).toBeVisible();
        });

        await thenStep(
          admin.page,
          {
            clause: "admin1 бачить у картці «Insurance: Private pay»",
            visible: ["рядок «Insurance: Private pay» у картці клієнта (сесія admin1)"],
            hidden: ["у базі статус картки — private_pay"],
          },
          async () => {
            await expect(statusLine(admin.page)).toHaveText("Insurance: Private pay");
            expect(await insuranceStatusOf(client.id)).toBe("private_pay");
          },
        );

        await when("потім scheduler2 відкриває картку client7", async () => {
          await openCard(scheduler2.page, client.id, client.name);
        });

        await thenStep(
          scheduler2.page,
          {
            clause: "scheduler2 бачить у картці «Insurance: Private pay»",
            visible: ["рядок «Insurance: Private pay» у картці клієнта (сесія scheduler2)"],
          },
          async () => {
            await expect(statusLine(scheduler2.page)).toHaveText("Insurance: Private pay");
          },
        );
      } finally {
        await closeSession(admin);
        await closeSession(scheduler2);
      }
    },
  );
});

test.describe("терапевт", () => {
  test.use({ storageState: auth("therapist1") });

  test(
    "AC-INS-04: therapist1 відкриває картку свого клієнта client6 — «Insurance: Not accepted», змінити статус не запропоновано",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-04" } },
    async ({ page }) => {
      let client = { id: "", email: "", name: "" };
      await given("client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»", async () => {
        client = await createUatClient({ suffix: "ins04", name: `Client Six ${RUN}`, insuranceStatus: "not_accepted" });
        await holdForTherapist(client.id, "therapist1@example.test");
      });

      await when("therapist1 відкриває картку client6", async () => {
        await openCard(page, client.id, client.name);
      });

      await thenStep(
        page,
        {
          clause:
            "він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано",
          visible: [
            "рядок «Insurance: Not accepted» у картці клієнта",
            "у картці немає поля «Insurance status» і кнопки «Save»",
          ],
        },
        async () => {
          await expect(statusLine(page)).toHaveText("Insurance: Not accepted");
          await expect(page.getByTestId("insurance-form")).toHaveCount(0);
          await expect(page.getByRole("combobox", { name: "Insurance status" })).toHaveCount(0);
          await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-INS-05: therapist1 напряму, оминаючи сторінки, пробує змінити статус client6 на «Verified» — статус не змінився, scheduler1 бачить «Insurance: Not accepted»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-05" } },
    async ({ page, browser }) => {
      let client = { id: "", email: "", name: "" };
      await given("client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»", async () => {
        client = await createUatClient({ suffix: "ins05", name: `Client Six ${RUN}`, insuranceStatus: "not_accepted" });
        await holdForTherapist(client.id, "therapist1@example.test");
        await openCard(page, client.id, client.name);
        await expect(statusLine(page)).toHaveText("Insurance: Not accepted");
      });

      let attempt: { rows: number; error: string | null } = { rows: -1, error: null };
      await when("therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус client6 на «Verified»", async () => {
        // Запит до API Supabase з сесією therapist1 — те саме, що зробив би користувач з інструментами браузера.
        const therapist = await userClient("therapist1@example.test");
        try {
          const { data, error } = await therapist
            .from("clients")
            .update({ insurance_status: "verified" })
            .eq("id", client.id)
            .select("id");
          attempt = { rows: data?.length ?? 0, error: error?.message ?? null };
        } finally {
          await therapist.auth.signOut();
        }
      });

      const scheduler = await sessionOf(browser, "scheduler1");
      try {
        await when("scheduler1 відкриває картку client6", async () => {
          await openCard(scheduler.page, client.id, client.name);
        });
        await thenStep(
          scheduler.page,
          {
            clause: "статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted»",
            visible: ["рядок «Insurance: Not accepted» у картці клієнта (сесія scheduler1)"],
            hidden: [
              "пряма спроба therapist1 змінила 0 рядків (RLS clients_update_insurance_staff)",
              "у базі статус картки — not_accepted",
            ],
          },
          async () => {
            await expect(statusLine(scheduler.page)).toHaveText("Insurance: Not accepted");
            expect(attempt).toEqual({ rows: 0, error: null });
            expect(await insuranceStatusOf(client.id)).toBe("not_accepted");
          },
        );
      } finally {
        await closeSession(scheduler);
      }
    },
  );
});

test.describe("без входу", () => {
  // Свіжий контекст без cookie — як вікно інкогніто.
  test.use({ storageState: { cookies: [], origins: [] } });

  test(
    "AC-INS-06: користувач без входу відкриває картку client6 за прямим посиланням — лише сторінка входу, а scheduler1 далі бачить «Insurance: Verified»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-INS-06" } },
    async ({ page, browser }) => {
      let client = { id: "", email: "", name: "" };
      await given("користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified»", async () => {
        client = await createUatClient({ suffix: "ins06", name: `Client Six ${RUN}`, insuranceStatus: "verified" });
      });

      await when("він відкриває картку client6 за прямим посиланням", async () => {
        await page.goto(`/clients/${client.id}`);
      });

      await thenStep(
        page,
        {
          clause: "він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано",
          visible: ["сторінка входу: поля «Email» і «Password», кнопка «Sign in»"],
          hidden: ["на сторінці немає рядка статусу, імені й email client6"],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === "/login");
          await expect(page.getByLabel("Email")).toBeVisible();
          await expect(page.getByLabel("Password")).toBeVisible();
          await expect(statusLine(page)).toHaveCount(0);
          await expect(page.getByText("Insurance:")).toHaveCount(0);
          await expect(page.getByText(client.name)).toHaveCount(0);
          await expect(page.getByText(client.email)).toHaveCount(0);
        },
      );

      const scheduler = await sessionOf(browser, "scheduler1");
      try {
        await when("scheduler1 після цього відкриває картку client6", async () => {
          await openCard(scheduler.page, client.id, client.name);
        });
        await thenStep(
          scheduler.page,
          {
            clause: "scheduler1 після цього бачить у картці client6 «Insurance: Verified»",
            visible: ["рядок «Insurance: Verified» у картці клієнта (сесія scheduler1)"],
            hidden: ["у базі статус картки — verified"],
          },
          async () => {
            await expect(statusLine(scheduler.page)).toHaveText("Insurance: Verified");
            expect(await insuranceStatusOf(client.id)).toBe("verified");
          },
        );
      } finally {
        await closeSession(scheduler);
      }
    },
  );
});
