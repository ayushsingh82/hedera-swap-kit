import { DocsPager } from "~~/components/docs/DocsPager";
import { DocsSidebar } from "~~/components/docs/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl grow flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-10 lg:py-10">
      <DocsSidebar />
      <main className="min-w-0 grow">
        {children}
        <DocsPager />
      </main>
    </div>
  );
}
