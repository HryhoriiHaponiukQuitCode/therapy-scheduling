// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — демо-репо курсу, scripts/mutants.mjs (тег ws8-02-tests); там 11 SQL- і 2 TS-мутанти.
// Поля:
//   id, kind ("sql" | "ts"), ac (який AC це правило доводить), what (що зламано — людською мовою);
//   file — що мутуємо; tests — файли тестів, які мають довести правило (саме їх і запускаємо);
//   find — рядок або RegExp, що трапляється у файлі РІВНО один раз (надійніше за номери рядків, які зсуваються);
//   replace — заміна (вставляється буквально: «$$» у plpgsql лишається «$$»);
//   expect: "survive" + reason — лише для еквівалентного мутанта (поведінка не змінюється) з посиланням на те,
//   що робить його еквівалентним (рядок міграції, інший тест). Без reason скрипт мутант не приймає.
// Новий AC з відмовою, правило якого живе в SQL (політика, grant, функція, тригер), — новий мутант тут.
//
// therapy-scheduling: P1 і P2 з матеріалів (перевірка гарнесу на profiles) не беремо — у нас свій PGlite-гарнес з WS6–WS7
// (tests/db/supabase-pglite.ts) і немає tests/db/profiles-db.test.ts. Мутанти нижче — на правила SQL за 3 AC WS8.
const OWN_CLIENTS = "supabase/migrations/20261027192525_therapist_own_clients.sql";
const CLIENT_CARDS = "supabase/migrations/20261027190554_client_cards.sql";
const CLIENT_ACCESS_DB = "tests/db/client-access.test.ts";
const CLIENT_CARDS_DB = "tests/db/client-cards.test.ts";

export const mutants = [
  {
    id: "C1", kind: "sql", ac: "AC-CARD-05", file: OWN_CLIENTS, tests: [CLIENT_ACCESS_DB],
    what: "clients_select_own_therapist: умову «роль therapist і є власне утримання» послаблено до true — терапевт бачить будь-яку картку",
    find: "    (select private.current_app_role()) = 'therapist'\n    and exists (",
    replace: "    true or exists (",
  },
  {
    id: "C2", kind: "sql", ac: "AC-CARD-05", file: OWN_CLIENTS, tests: [CLIENT_ACCESS_DB],
    what: "clients_select_own_therapist: прибрано умову «утримання цього терапевта» (h.therapist_id = auth.uid())",
    expect: "survive",
    reason:
      "еквівалентний: підзапит до holds виконується під RLS того, хто дивиться; для ролі therapist (private.is_staff() " +
      "хибне, тож holds_select_staff не діє) єдина політика select — holds_select_own_therapist " +
      "«using (therapist_id = (select auth.uid()))» у 20261019105344_availability_and_holds.sql:111. Умова в " +
      "clients_select_own_therapist дублює її як захист на випадок зміни RLS holds.",
    find: "        and h.therapist_id = (select auth.uid())\n",
    replace: "",
  },
  {
    id: "C3", kind: "sql", ac: "AC-CARD-06", file: CLIENT_CARDS, tests: [CLIENT_CARDS_DB],
    what: "clients_insert_staff: перевірку «лише admin і scheduler» послаблено до true — терапевт створює картку запитом",
    find: "    (select private.is_staff())\n    and created_by = (select auth.uid())",
    replace: "    true\n    and created_by = (select auth.uid())",
  },
];

// Приклади з демо (інша схема — у вашому репо цих файлів немає, тож не розкоментовуйте як є):
//
// SQL, межа з AC — діапазон напіввідкритий, останній день заявки не рахується:
//   { id: "L2", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
//     what: "перетин: діапазон НОВОЇ заявки напіввідкритий [початок, кінець)",
//     find: "pg_catalog.daterange(p_start_date, p_end_date, '[]')",
//     replace: "pg_catalog.daterange(p_start_date, p_end_date, '[)')" },
//
// SQL, політика послаблена до true (а не видалена: без політики RLS забороняє все, і тест відмови лишився б зеленим):
//   { id: "L5", kind: "sql", ac: "передумова AC-LEAVE-04/10", file: LEAVE, tests: [LEAVE_DB],
//     what: "blocked_days: insert дозволено будь-кому з входом, а не лише адміністратору",
//     find: "on public.blocked_days for insert to authenticated\n  with check ((select private.current_app_role()) = 'admin');",
//     replace: "on public.blocked_days for insert to authenticated\n  with check (true);" },
//
// Еквівалентний мутант — лише з reason, що посилається на рядок, який робить його зайвим:
//   { id: "L6", kind: "sql", ac: "AC-LEAVE-06/07", file: RECORDS, tests: [LEAVE_DB],
//     what: "політика рішень: прибрано role = 'manager'", expect: "survive",
//     reason: "еквівалентний: з 20261018000000_manager_helpers_require_role.sql private.is_division_manager() сама " +
//       "перевіряє current_app_role() = 'manager'", find: "…", replace: "…" },
//
// TS, точковий мутант на межі з AC (повний перебір TS — npm run mutation:ts, Stryker):
//   { id: "T1", kind: "ts", ac: "AC-LEAVE-11", file: "src/lib/leave/calendar.ts", tests: ["tests/leave/calendar.test.ts"],
//     what: "rangesOverlap: <= → <", find: "b.startDate <= a.endDate", replace: "b.startDate < a.endDate" },
