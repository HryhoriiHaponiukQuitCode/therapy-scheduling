import { PageHeader } from "./page-header";
import { Panel } from "./ui/panel";

// Відмова в доступі (DESIGN.md, розділ 6): панель з поясненням, без даних; текст — дослівно з AC відмови.
export function AccessDenied({ title, message }: { title: string; message: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Panel>
        <p className="m-0 font-semibold" data-testid="access-denied">
          {message}
        </p>
      </Panel>
    </>
  );
}
