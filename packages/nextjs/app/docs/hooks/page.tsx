import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, DocTable, Inline, Row } from "~~/components/docs/DocsParts";

const hooks: Row[] = [
  [
    "useSwap()",
    "Approves SwapHelper if needed, sends the right swap, waits for the receipt. Returns swap, reset, status, hash, error.",
  ],
  ["useQuote(route, amountIn)", "Quotes through QuoterV2 every 15 seconds. Returns amountOut, fee and price impact."],
  ["useRoute(tokenIn, tokenOut)", "Best route from live liquidity: a direct pool, or two hops through WHBAR."],
  ["useTokenList()", "HBAR first, then every SaucerSwap token that has a V2 pool."],
  ["useTokenBalances()", "HBAR from the wallet, HTS tokens from the mirror node."],
  ["useAssociation(token, subject)", "Whether the wallet or SwapHelper is associated, and a way to associate."],
  ["useSwapHistory(limit?)", "Recent swaps for the account, read from the mirror node's contract logs."],
  ["usePools()", "All V2 pools for the current network."],
  ["useSwapHelper()", "Address and integrator fee of the deployed SwapHelper."],
  ["useSwapNetwork()", "SaucerSwap, mirror node and Hashscan endpoints for the wallet's chain."],
];

const HooksPage: NextPage = () => (
  <>
    <DocHeader title="Hooks" summary="Everything is in hooks/swap. Import from ~~/hooks/swap." />

    <DocSection title="All hooks">
      <DocTable rows={hooks} head={["Hook", "What it does"]} />
    </DocSection>

    <DocSection title="Run a swap">
      <CodeBlock
        code={`const { swap, status, hash, error } = useSwap();

await swap({
  tokenIn,
  tokenOut,
  route,
  amountIn,
  amountOutMinimum: applySlippage(quote.amountOut, 50), // 0.5%
  // optional
  recipient: "0x...",       // defaults to the connected account
  deadlineSeconds: 600n,    // defaults to 10 minutes
});`}
      />
      <p>
        <Inline>swap</Inline> resolves to the transaction hash, or <Inline>undefined</Inline> on failure (see{" "}
        <Inline>error</Inline>). It converts the HBAR value to weibar for you.
      </p>
    </DocSection>

    <DocSection title="Pure helpers">
      <DocTable
        head={["Module", "Exports"]}
        rows={[
          ["utils/swap/math", "parseAmount, formatAmount, applySlippage, priceImpactPercent, splitFee"],
          ["utils/swap/route", "findRoute, encodePath, toSwapPools"],
          ["utils/swap/tokens", "HBAR, buildTokenList, fromApiToken, pathId"],
          ["utils/swap/config", "getSwapNetwork, idToEvmAddress, hashscanTx"],
          ["utils/swap/history", "parseSwapLogs"],
        ]}
      />
    </DocSection>
  </>
);

export default HooksPage;
