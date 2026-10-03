"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeBlock } from "~~/components/CodeBlock";

const widgets = [
  {
    id: "swap",
    label: "Swap",
    text: "The full swap card: quotes, slippage, price impact, association and transaction status.",
    href: "/swap",
    code: `import { SwapWidget } from "~~/components/swap";

export default function Page() {
  return <SwapWidget />;
}`,
  },
  {
    id: "pay",
    label: "Pay",
    text: "A checkout. The buyer pays with any token and your address receives the token you set.",
    href: "/pay",
    code: `import { SwapWidget } from "~~/components/swap";

export default function Checkout({ shop }: { shop: \`0x\${string}\` }) {
  return (
    <SwapWidget
      title="Pay"
      defaultTokenOut="0.0.1183558"
      lockTokenOut
      recipient={shop}
      buttonLabel="Pay"
    />
  );
}`,
  },
  {
    id: "buy",
    label: "Buy",
    text: "An on-ramp for one token. The output is fixed, so buyers can only buy yours.",
    href: "/buy",
    code: `import { SwapWidget } from "~~/components/swap";

export default function BuyMyToken() {
  return <SwapWidget title="Buy" defaultTokenOut="0.0.YOUR_TOKEN" lockTokenOut buttonLabel="Buy" />;
}`,
  },
  {
    id: "payouts",
    label: "Payouts",
    text: "Paste a list and pay everyone in one transaction, each in the token they want.",
    href: "/payouts",
    code: `import { PayoutsForm } from "~~/components/use-cases";

export default function Payroll() {
  return <PayoutsForm />;
}`,
  },
  {
    id: "dca",
    label: "Auto-buy",
    text: "Recurring purchases that the Hedera Schedule Service runs by itself, with progress and cancel.",
    href: "/dca",
    code: `import { DcaForm, DcaPlans } from "~~/components/use-cases";

export default function AutoBuy() {
  return (
    <>
      <DcaForm />
      <DcaPlans />
    </>
  );
}`,
  },
] as const;

/** One tab per drop-in widget, each with a snippet and a link to the live page. */
export const WidgetTabs = () => {
  const [active, setActive] = useState<(typeof widgets)[number]["id"]>("swap");
  const widget = widgets.find(w => w.id === active) ?? widgets[0];

  return (
    <div>
      <div role="tablist" className="tabs tabs-box mb-4 w-fit flex-wrap">
        {widgets.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === active}
            className={`tab ${id === active ? "tab-active" : ""}`}
            onClick={() => setActive(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm opacity-80">
        {widget.text}{" "}
        <Link href={widget.href} className="link link-primary">
          Open the live page
        </Link>
      </p>
      <CodeBlock code={widget.code} filename={`app/${widget.id}/page.tsx`} />
    </div>
  );
};
