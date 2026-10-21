// Ініціали для кола-аватара (Select, ChoiceList, список клієнтів): перші літери двох перших слів імені.
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

export function Avatar({ name, className = "size-10 text-[13px]" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`avatar ${className}`}>
      {initials(name)}
    </span>
  );
}
