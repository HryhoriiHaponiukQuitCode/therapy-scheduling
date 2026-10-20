import { SignedInShell } from "@/components/app-shell";

// Бічна панель — у layout, а не на сторінці: під час переходу loading.tsx замінює лише контент.
export default function ClientsLayout({ children }: LayoutProps<"/clients">) {
  return <SignedInShell>{children}</SignedInShell>;
}
