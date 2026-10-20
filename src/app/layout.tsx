import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getRequestTheme } from "@/lib/request-theme";
import "./globals.css";

// Розділ 2.4: один шрифт Manrope (next/font, не npm-залежність). Інтерфейс англійською (розділ 6), кирилиця —
// для імен клієнтів і терапевтів, якщо їх введуть кирилицею.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Practice scheduling",
  description: "Next.js + Supabase + OpenSpec",
};

// Тема — з cookie (світла за замовчуванням), тож сторінка одразу приходить у вибраній темі, без спалаху.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getRequestTheme();
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
