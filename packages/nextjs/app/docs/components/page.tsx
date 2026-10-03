import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, DocTable, Inline, Row } from "~~/components/docs/DocsParts";

const components: Row[] = [
  [
    "SwapWidget",
    "The drop-in widget. Composes everything below and swaps through SwapHelper. Optional props: title, defaultTokenOut, lockTokenOut, recipient, buttonLabel.",
  ],
  [
    "TokenSelect",
    "Searchable token picker with icon, symbol and balance. Props: tokens, value, onChange, balanceOf?, disabledToken?",
  ],
  ["AmountInput", "Amount field with balance, MAX button and USD value. Takes a tokenSelect slot."],
  ["SlippageSettings", "Slippage presets, custom value and deadline. Props: value, onChange."],
  ["QuoteDetails", "Rate, minimum received, price impact, route and fees for a quote."],
  [
    "AssociateButton",
    'One-click HTS association. subject is "wallet" (token you receive) or "helper" (token you pay with).',
  ],
  ["TxStatus", "Pending, success and error states with a Hashscan link."],
  ["SwapHistory", "The connected account's recent swaps, read from the mirror node."],
  ["PoolsTable", "SaucerSwap V2 pools with fee tier, reserves and TVL. Prop: limit?"],
];

const ComponentsPage: NextPage = () => (
  <>
    <DocHeader
      title="Components"
      summary="Everything is in components/swap. Use the whole widget, or pick the parts you need."
    />

    <DocSection title="Drop in the widget">
      <CodeBlock
        filename="app/page.tsx"
        code={`import { SwapWidget } from "~~/components/swap";

export default function Page() {
  return <SwapWidget />;
}`}
      />
      <p>
        It needs a wallet provider (the scaffold layout has one) and <Inline>SwapHelper</Inline> deployed on the active
        network. To change its layout, copy <Inline>SwapWidget.tsx</Inline> into your app and rearrange the parts.
      </p>
    </DocSection>

    <DocSection title="All components">
      <DocTable rows={components} head={["Component", "What it does"]} />
      <p>
        Amounts are <Inline>bigint</Inline> in a token&apos;s smallest unit (tinybar for HBAR).
      </p>
    </DocSection>

    <DocSection title="Compose your own">
      <CodeBlock
        code={`<TokenSelect tokens={tokens} value={token} onChange={setToken} balanceOf={balanceOf} />
<AssociateButton token={tokenOut} subject="wallet" />
<AssociateButton token={tokenIn} subject="helper" />`}
      />
    </DocSection>
  </>
);

export default ComponentsPage;
