"use client";

import { useState, type ChangeEvent } from "react";
import { Avatar } from "./avatar";

export type Choice = { value: string; label: string; detail?: string };

// Список-вибір кількох терапевтів (розділ 4.2): чекбокси name={name} GET-форми; зміна одразу відправляє форму
// (requestSubmit, далі SlotsNavigation), без JavaScript — кнопка «Show». Рядок 60px: квадрат-чекбокс, коло з
// ініціалами, імʼя 600. Останнього вибраного зняти не можна: без вибору сторінка показала б перших терапевтів за замовчуванням.
export function ChoiceList({ name, choices, values }: { name: string; choices: Choice[]; values: string[] }) {
  const [checked, setChecked] = useState(values);
  // Новий вибір із сервера (перехід завершився) — показуємо його.
  const [shown, setShown] = useState(values);
  if (values.join() !== shown.join()) {
    setShown(values);
    setChecked(values);
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked: on, form } = event.currentTarget;
    const next = on ? [...checked, value] : checked.filter((v) => v !== value);
    if (next.length === 0) return;
    setChecked(next);
    // Браузер уже змінив стан чекбокса до події change, тож FormData форми бачить новий вибір.
    form?.requestSubmit();
  };

  return (
    <>
      <ul role="list" className="m-0 flex list-none flex-col gap-1.5 p-0">
        {choices.map((choice) => {
          const on = checked.includes(choice.value);
          return (
            <li key={choice.value}>
              <label
                className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-md border py-2 pr-3 pl-3 ${
                  on ? "border-glass-edge bg-glass-hi shadow-glass" : "border-transparent hover:bg-glass"
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={choice.value}
                  checked={on}
                  onChange={onChange}
                  className="size-5 flex-none cursor-pointer accent-navy"
                />
                <Avatar name={choice.label} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold" title={choice.label}>
                    {choice.label}
                  </span>
                  {choice.detail ? <span className="block text-xs text-muted">{choice.detail}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <noscript>
        <button type="submit" className="mt-3 min-h-11 rounded-full border border-navy px-5 text-sm font-semibold text-navy">
          Show
        </button>
      </noscript>
    </>
  );
}
