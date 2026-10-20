// Inline SVG іконки дизайн-системи (docs/design/design-system.md, розділ 4): stroke, currentColor, без залежностей.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(viewBox: string, props: IconProps) {
  return {
    viewBox,
    fill: "none",
    stroke: "currentColor",
    "aria-hidden": true,
    focusable: false,
    ...props,
  } as const;
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <path d="M3 8l6-4.5L15 8v6.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M7.5 15.5V11h3v4.5" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <circle cx="7" cy="6.5" r="2.6" />
      <path d="M2.5 14.5c.5-2.6 2.3-4 4.5-4s4 1.4 4.5 4" />
      <path d="M12 4.2a2.6 2.6 0 0 1 0 5M13.5 10.8c1 .6 1.7 1.9 2 3.7" />
    </svg>
  );
}

export function SlotsIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3M6 10.5h2M10 10.5h2M6 13h2" />
    </svg>
  );
}

export function ScheduleIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 5.5V9l2.5 1.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4} strokeLinecap="round">
      <path d="M3 4.5h12M5.5 9h7M8 13.5h2" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <path d="M3.2 9a5.8 5.8 0 1 0 1.7-4.1M3 3v3h3" />
      <path d="M9 6v3l2 1.3" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.4}>
      <circle cx="9" cy="6.5" r="3" />
      <path d="M3.5 15c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base("0 0 16 16", props)} strokeWidth={1.5}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base("0 0 16 16", props)} strokeWidth={1.6}>
      <path d="M10 4l-4 4 4 4" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base("0 0 16 16", props)} strokeWidth={1.6}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base("0 0 12 12", props)} strokeWidth={1.6}>
      <path d="M2.5 6.3l2.2 2.2 4.8-5" />
    </svg>
  );
}

export function SuccessIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.6}>
      <circle cx="9" cy="9" r="7.2" />
      <path d="M5.8 9.2l2.2 2.2 4.2-4.4" />
    </svg>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <svg {...base("0 0 18 18", props)} strokeWidth={1.6}>
      <circle cx="9" cy="9" r="7.2" />
      <path d="M9 5.5v4.2M9 12.3v.2" strokeWidth={1.8} />
    </svg>
  );
}

// Іконки статусів 12px (розділ 4): Free — коло, Held — годинник, Confirmed — галочка, Expired — перекреслене коло.
export function FreeIcon(props: IconProps) {
  return (
    <svg {...base("0 0 12 12", props)} strokeWidth={1.5}>
      <circle cx="6" cy="6" r="4" />
    </svg>
  );
}

export function HeldIcon(props: IconProps) {
  return (
    <svg {...base("0 0 12 12", props)} strokeWidth={1.4}>
      <circle cx="6" cy="6" r="4.2" />
      <path d="M6 3.6V6l1.6 1" />
    </svg>
  );
}

export function ExpiredIcon(props: IconProps) {
  return (
    <svg {...base("0 0 12 12", props)} strokeWidth={1.4}>
      <circle cx="6" cy="6" r="4.2" />
      <path d="M3.2 8.8l5.6-5.6" />
    </svg>
  );
}

// Знак застосунку (розділ 3): два перекриті кола блакитного й лавандового градієнтів, 48px — свій знак.
export function BrandMark({ size = 48, ...props }: IconProps & { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable={false} {...props}>
      <defs>
        <linearGradient id="brand-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9cc0ff" />
          <stop offset="1" stopColor="#5b7cf0" />
        </linearGradient>
        <linearGradient id="brand-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3d9ff" />
          <stop offset="1" stopColor="#a99bff" />
        </linearGradient>
      </defs>
      <circle cx="19" cy="22" r="13" fill="url(#brand-a)" />
      <circle cx="29" cy="27" r="11" fill="url(#brand-b)" opacity={0.9} />
      <circle cx="15" cy="17" r="4" fill="#fff" opacity={0.7} />
    </svg>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <svg {...base("0 0 24 24", props)} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}
