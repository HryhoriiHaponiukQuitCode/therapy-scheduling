import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ColumnNotice, DayGrid, type DayGridColumn } from "@/components/day-grid";

// Погодинна сітка /slots і /my-schedule: повідомлення колонки — у її шапці (не окремим рядком сітки), минулі
// години — компактні рядки без дій (DESIGN.md, «Патерни взаємодії»).
const slot = (time: string, status: "Free" | "Held" | "Confirmed" | "Past", action?: string) => ({
  key: time,
  time,
  status,
  client: null,
  heldUntil: null,
  action: action ? createElement("button", { type: "button" }, action) : undefined,
});

function render(columns: DayGridColumn[]) {
  return renderToStaticMarkup(createElement(DayGrid, { columns, label: "Slots on 2026-11-03" }));
}

describe("DayGrid", () => {
  it("AC-HOLD-33: «No free slots on this day.» — у шапці колонки, над усіма її слотами", () => {
    const html = render([
      {
        key: "t1",
        header: createElement(
          "span",
          null,
          "Therapist One",
          createElement(ColumnNotice, { role: "status", "data-testid": "no-free-slots" }, "No free slots on this day."),
        ),
        slots: [slot("10:00", "Past"), slot("11:00", "Past"), slot("13:00", "Held"), slot("14:00", "Confirmed")],
      },
    ]);

    const notice = html.indexOf('data-testid="no-free-slots"');
    expect(notice).toBeGreaterThan(-1);
    // Повідомлення — у рядку заголовків (columnheader), а не окремим рядком сітки перед годинами.
    expect(html.lastIndexOf('role="columnheader"', notice)).toBeGreaterThan(-1);
    expect(html.indexOf('role="rowheader"')).toBeGreaterThan(notice);
    for (const status of ["Past", "Held", "Confirmed"]) {
      expect(html.indexOf(`>${status}<`)).toBeGreaterThan(notice);
    }
  });

  it("минула година з самими «Past» — компактний рядок без дії; година з вільним слотом — повний", () => {
    const html = render([
      { key: "t1", header: "Therapist One", slots: [slot("09:00", "Past"), slot("10:00", "Free", "Hold")] },
      { key: "t2", header: "Therapist Two", slots: [slot("09:00", "Past"), slot("10:00", "Past")] },
    ]);
    const rows = html.split('role="row"').slice(2); // без префікса й рядка заголовків
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("min-h-14");
    expect(rows[0]).not.toContain("min-h-[124px]");
    // 10:00 — у Therapist One вільний слот: рядок повної висоти, кнопка на місці.
    expect(rows[1]).toContain("min-h-[124px]");
    expect(rows[1]).toContain(">Hold<");
  });
});
