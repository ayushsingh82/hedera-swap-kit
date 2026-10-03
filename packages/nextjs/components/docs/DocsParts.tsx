export type Row = [name: string, description: string];

/** The title and one-line summary at the top of a docs page. */
export const DocHeader = ({ title, summary }: { title: string; summary: string }) => (
  <header className="mb-8">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="mt-2 text-sm opacity-70">{summary}</p>
  </header>
);

export const DocSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="mb-3 text-xl font-bold">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

export const DocTable = ({ rows, head }: { rows: Row[]; head: [string, string] }) => (
  <div className="overflow-x-auto rounded-2xl border border-base-300">
    <table className="table">
      <thead>
        <tr>
          <th>{head[0]}</th>
          <th>{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, description]) => (
          <tr key={name}>
            <td className="whitespace-nowrap align-top font-mono text-xs font-semibold">{name}</td>
            <td className="text-sm">{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Inline = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-base-200 px-1 font-mono text-xs">{children}</code>
);
