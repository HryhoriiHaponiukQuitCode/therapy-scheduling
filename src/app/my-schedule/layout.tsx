import { SignedInShell } from "@/components/app-shell";

// Бічна панель — у layout, а не на сторінці: під час переходу loading.tsx замінює лише контент.
export default function MyScheduleLayout({ children }: LayoutProps<"/my-schedule">) {
  return <SignedInShell>{children}</SignedInShell>;
}
