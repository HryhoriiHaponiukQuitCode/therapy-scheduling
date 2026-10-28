import Image from "next/image";

// Знак застосунку (DESIGN.md, розділ 2): хрест із серцем і пульсом, public/brand/practice-scheduling-icon.svg — той
// самий файл, що й src/app/icon.svg (вкладка браузера). Однаковий в обох темах. Декоративний: назва — текстом поруч.
export function BrandMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/practice-scheduling-icon.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}
