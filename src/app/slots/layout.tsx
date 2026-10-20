import { SignedInShell } from "@/components/app-shell";

// Бічна панель — у layout, а не на сторінці: під час переходу loading.tsx замінює лише контент.
export default function SlotsLayout({ children }: LayoutProps<"/slots">) {
  return <SignedInShell>{children}</SignedInShell>;
}
