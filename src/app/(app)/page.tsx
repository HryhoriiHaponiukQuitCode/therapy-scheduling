import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { APP_ROLES, isStaff, NO_ROLE_MESSAGE } from "@/lib/roles";
import { bookedPercent, totalSlots } from "@/lib/stats";
import { ActionMessage } from "@/components/action-message";
import { EmptyState } from "@/components/empty-state";
import { CalendarIcon, CheckIcon, FreeIcon, HeldIcon } from "@/components/icons";
import { NoAccess } from "@/components/no-access";
import { CountsTable, DayChart, StatTile, TableView } from "@/components/schedule-stats";
import { loadHomeStats } from "./data";
import { DaysPanel, HomeShell, StatTiles, TherapistsPanel } from "./shell";

// Головна: статистика найближчих 7 днів (DESIGN.md, розділ 6b). Адміністратор і планувальник — уся практика й розбивка
// за терапевтами, терапевт — власний розклад. Вимог PM до вмісту головної немає: це довідка, не AC.
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
export default async function Home() {
  // getClaims() + власний профіль (RLS) — у getCurrentUser (через getRequestUser: той самий виклик, що в layout).
  // getSession() для авторизації не використовуємо.
  // Будь-яка роль застосунку (APP_ROLES, тож гілки forbidden тут немає); без ролі — лише NoAccess (AC-CARD-11).
  const access = await getPageAccess(APP_ROLES, NO_ROLE_MESSAGE);
  if (access.kind !== "ok") return <NoAccess />;
  const user = access.user;
  const staff = isStaff(user.role);
  const stats = await loadHomeStats(await createClient(), user, new Date());
  const description = staff
    ? "Whole practice, next 7 days. Times in America/Los_Angeles."
    : "Your schedule, next 7 days. Times in America/Los_Angeles.";

  if (!stats) {
    return (
      <HomeShell description={description}>
        <ActionMessage state={{ status: "error", message: "Could not load statistics. Try again later." }} />
      </HomeShell>
    );
  }

  const { totals } = stats;
  const booked = totals.held + totals.confirmed;
  const total = totalSlots(totals);

  return (
    <HomeShell description={description}>
      <StatTiles>
        <StatTile icon={<CheckIcon />} label="Sessions" value={totals.confirmed} caption="Confirmed" />
        <StatTile icon={<HeldIcon />} label="Held" value={totals.held} caption="Waiting for confirmation" />
        <StatTile icon={<FreeIcon />} label="Free slots" value={totals.free} caption="Not booked yet" />
        <StatTile
          icon={<CalendarIcon />}
          label="Booked"
          value={`${bookedPercent(totals) ?? 0}%`}
          caption={`${booked} of ${total} upcoming slots`}
        />
      </StatTiles>
      <DaysPanel>
        {total === 0 ? (
          // Власне формулювання: PM тексту для головної не задав.
          <EmptyState data-testid="no-upcoming-slots">No upcoming slots in the next 7 days.</EmptyState>
        ) : (
          <>
            <DayChart days={stats.days} today={stats.from} />
            <TableView>
              <CountsTable
                caption="Upcoming slots by day"
                head="Day"
                rows={stats.days.map((day) => ({
                  key: day.date,
                  label: <span className="whitespace-nowrap">{day.date}</span>,
                  counts: day,
                }))}
                total={totals}
              />
            </TableView>
          </>
        )}
      </DaysPanel>
      {staff ? (
        <TherapistsPanel>
          {stats.therapists.length === 0 ? (
            <EmptyState data-testid="no-therapists">No therapists yet.</EmptyState>
          ) : (
            <CountsTable
              caption="Upcoming slots by therapist"
              head="Therapist"
              rows={stats.therapists.map((therapist) => ({
                key: therapist.id,
                label: therapist.name,
                counts: therapist,
              }))}
              meter
            />
          )}
        </TherapistsPanel>
      ) : null}
    </HomeShell>
  );
}
