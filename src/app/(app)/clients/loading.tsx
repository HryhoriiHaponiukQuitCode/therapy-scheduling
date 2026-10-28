import { LoadingStatus } from "@/components/route-status";
import { CLIENT_ITEM, CLIENT_LIST, ClientRowSkeleton, ClientsShell } from "./shell";

// Миттєвий стан переходу на /clients: той самий каркас (ClientsShell) — одна панель зі списком, рядки — скелетонами.
export default function ClientsLoading() {
  return (
    <>
      <LoadingStatus />
      <ClientsShell>
        <ul aria-hidden className={CLIENT_LIST}>
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={CLIENT_ITEM}>
              <ClientRowSkeleton />
            </li>
          ))}
        </ul>
      </ClientsShell>
    </>
  );
}
