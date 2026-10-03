import Link from "next/link";
import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, DocTable, Inline } from "~~/components/docs/DocsParts";

const PayDocsPage: NextPage = () => (
  <>
    <DocHeader
      title="Pay in any token"
      summary="A checkout where the buyer pays with any token and the receiver gets the token they chose."
    />

    <DocSection title="How it works">
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          The receiver opens{" "}
          <Link className="link" href="/pay">
            /pay
          </Link>
          , enters their address and the token they want, and copies the link.
        </li>
        <li>The buyer opens the link, picks what they pay with, sees a quote and pays.</li>
        <li>
          The swap runs through <Inline>SwapHelper</Inline> with the receiver as the <Inline>recipient</Inline>, so the
          tokens go straight to them.
        </li>
      </ol>
      <p>No new contract is needed: every swap function already takes a recipient.</p>
    </DocSection>

    <DocSection title="The link">
      <CodeBlock language="bash" code="/pay?to=0x...&token=0.0.1183558&label=Cafe&order=1042" />
      <DocTable
        head={["Parameter", "Meaning"]}
        rows={[
          ["to", "Receiver address (EVM). Required."],
          ["token", "Token the receiver gets: a Hedera id or HBAR. Default HBAR."],
          ["label", "Shop name shown to the buyer. Optional."],
          ["order", "Order id shown to the buyer. Optional."],
        ]}
      />
    </DocSection>

    <DocSection title="Embed the checkout">
      <CodeBlock
        code={`<SwapWidget title="Pay" defaultTokenOut="0.0.1183558" lockTokenOut recipient={shop} buttonLabel="Pay" />`}
      />
    </DocSection>

    <DocSection title="Limits to know">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The buyer sets what they <b>pay</b>; the receiver gets the quoted amount at that moment. An exact amount for
          the receiver needs an exact-output swap, which this version does not have.
        </li>
        <li>The order id is shown in the page only. It is not recorded on-chain yet.</li>
        <li>The receiver needs a Hedera account. The widget warns the buyer if the receiver cannot take the token.</li>
      </ul>
    </DocSection>
  </>
);

export default PayDocsPage;
