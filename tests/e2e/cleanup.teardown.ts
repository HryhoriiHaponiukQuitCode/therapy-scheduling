// Прибирання після прогону (teardown проєкту setup): видаляє всіх uat-*@example.test і картки клієнтів UAT, навіть
// залишки обірваних прогонів, і падає, якщо хоч один лишився. Підсумок — у test-results/uat-cleanup.json (його читає звіт UAT).
// Без SUPABASE_SECRET_KEY (прогін лише AC, що нічого не пишуть: --grep-invert '@writes') прибирати нічого — тесту немає.
import { writeFileSync } from "node:fs";
import { expect, test as teardown } from "@playwright/test";
import { deleteUatClients, deleteUatUsers, deletedClientsThisRun, deletedThisRun, hasAdminKey } from "./support/admin";

if (hasAdminKey()) {
  teardown("прибирання: синтетичні uat-*@example.test", async () => {
    // Спершу картки клієнтів UAT (зріз 3) разом з утриманнями, потім користувачі.
    const clients = await deleteUatClients();
    const result = await deleteUatUsers();
    writeFileSync(
      "test-results/uat-cleanup.json",
      // deleted — усе, що прибрав цей прогін: afterAll специфікацій і цей teardown.
      JSON.stringify(
        {
          at: new Date().toISOString(),
          ...result,
          deleted: deletedThisRun(),
          clients: { deleted: deletedClientsThisRun(), remaining: clients.remaining },
        },
        null,
        2,
      ),
    );
    expect(clients.remaining, "лишились картки клієнтів UAT").toEqual([]);
    expect(result.remaining, "лишились синтетичні користувачі").toEqual([]);
    expect(result.leftoverRequests, "лишились заявки синтетичних користувачів").toBe(0);
  });
}
