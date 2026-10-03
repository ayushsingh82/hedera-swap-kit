import Link from "next/link";
import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, Inline } from "~~/components/docs/DocsParts";

const BuyDocsPage: NextPage = () => (
  <>
    <DocHeader
      title="Buy a token"
      summary="An on-ramp for one token: the swap widget with the output fixed. Good for a project's own token page."
    />

    <DocSection title="Use the page">
      <p>
        <Link className="link" href="/buy">
          /buy
        </Link>{" "}
        sells one token. Choose it with a query parameter or an environment variable:
      </p>
      <CodeBlock
        language="bash"
        code={`/buy?token=0.0.1183558\n\n# or, in packages/nextjs/.env\nNEXT_PUBLIC_BUY_TOKEN=0.0.1183558`}
      />
      <p>
        The value is a Hedera token id or a symbol. It defaults to SAUCE. The buyer pays with HBAR or any token, and the
        tokens arrive in their wallet.
      </p>
    </DocSection>

    <DocSection title="Embed it">
      <CodeBlock code={`<SwapWidget title="Buy" defaultTokenOut="0.0.YOUR_TOKEN" lockTokenOut buttonLabel="Buy" />`} />
      <p>
        <Inline>lockTokenOut</Inline> hides the output picker so the buyer cannot change what they are buying. The token
        needs a SaucerSwap V2 pool with liquidity.
      </p>
    </DocSection>
  </>
);

export default BuyDocsPage;
