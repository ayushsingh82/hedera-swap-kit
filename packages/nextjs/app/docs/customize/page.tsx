import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, Inline } from "~~/components/docs/DocsParts";

const CustomizePage: NextPage = () => (
  <>
    <DocHeader title="Customize" summary="Common changes and the files to touch." />

    <DocSection title="Change the fee">
      <p>
        The owner sets the fee in basis points, up to 100 (1%). Use the <Inline>/debug</Inline> page, or a script:
      </p>
      <CodeBlock code={`await helper.setFee(30); // 0.30%`} />
      <p>
        The fee accrues inside the contract. Collect it with <Inline>withdrawTokenFees</Inline> or{" "}
        <Inline>withdrawHbarFees</Inline>. The recipient must be associated with the token.
      </p>
    </DocSection>

    <DocSection title="Add a token">
      <p>
        Any token with a SaucerSwap V2 pool appears on its own. To restrict the list, filter in{" "}
        <Inline>buildTokenList</Inline> (<Inline>utils/swap/tokens.ts</Inline>).
      </p>
    </DocSection>

    <DocSection title="Add a pool">
      <p>
        Create liquidity in the SaucerSwap app. Once a pool has liquidity, <Inline>/pools</Inline> and the route finder
        pick it up. A liquidity add and remove UI is not part of this template.
      </p>
    </DocSection>

    <DocSection title="Swap the DEX out">
      <p>
        <Inline>SwapHelper</Inline> only needs three router functions: <Inline>exactInput</Inline>,{" "}
        <Inline>unwrapWHBAR</Inline> and <Inline>multicall</Inline>. For another V3-style DEX:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Add its router, quoter and WHBAR addresses to <Inline>packages/hardhat/utils/saucerswap.ts</Inline> and{" "}
          <Inline>utils/swap/config.ts</Inline>.
        </li>
        <li>If its ABI differs, update the interface, the contract, the mock router and the tests.</li>
        <li>
          Point the data hooks at its API (<Inline>saucerApi</Inline> in the config).
        </li>
        <li>Redeploy and run the tests.</li>
      </ol>
    </DocSection>

    <DocSection title="Go to mainnet">
      <p>The mainnet ids are already in the config. Check each one on HashScan and run a small swap first.</p>
      <CodeBlock language="bash" code="npm run hardhat:deploy -- --network hederaMainnet" />
      <p>Then switch the wallet to Hedera Mainnet (chain 295). The kit picks the mainnet endpoints from the chain.</p>
    </DocSection>
  </>
);

export default CustomizePage;
