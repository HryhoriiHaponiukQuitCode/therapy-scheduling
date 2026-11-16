import type { TextareaHTMLAttributes } from "react";

// Багаторядкове поле (DESIGN.md, розділ 5): ті самі тло accent і межа input, що в Input, але радіус rounded-lg,
// бо пігулка для кількох рядків не читається. aria-invalid → межа destructive.
export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full resize-y rounded-lg border border-input bg-accent px-[18px] py-3 text-sm font-medium text-foreground aria-invalid:border-destructive ${className}`}
    />
  );
}
