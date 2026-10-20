import { Avatar } from "./avatar";

export type Choice = { value: string; label: string };

// Список-вибір терапевта (розділ 4.2): кожен варіант — submit-кнопка GET-форми з aria-pressed, тож вибір одразу
// відправляє форму й без JavaScript. Рядок 60px: коло з ініціалами, імʼя 600, праворуч кільце-радіо;
// вибраний — glass-hi з тінню і заповнене коло navy з галочкою.
export function ChoiceList({ name, choices, value }: { name: string; choices: Choice[]; value: string | null }) {
  return (
    <ul role="list" className="m-0 flex list-none flex-col gap-1.5 p-0">
      {choices.map((choice) => {
        const pressed = choice.value === value;
        return (
          <li key={choice.value}>
            <button
              type="submit"
              name={name}
              value={choice.value}
              aria-pressed={pressed}
              className={`flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-md border py-2 pr-3 pl-2 text-left text-ink ${
                pressed ? "border-glass-edge bg-glass-hi shadow-glass" : "border-transparent bg-transparent hover:bg-glass"
              }`}
            >
              <Avatar name={choice.label} />
              <span className="min-w-0 flex-1 truncate font-semibold">{choice.label}</span>
              <span
                aria-hidden
                className={`grid size-[22px] flex-none place-items-center rounded-full border-[1.5px] ${
                  pressed ? "border-navy bg-navy text-on-navy" : "border-border-strong"
                }`}
              >
                {pressed ? (
                  <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2.5 6.3l2.2 2.2 4.8-5" />
                  </svg>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
