import type { NextPage } from "next";
import { DocHeader, DocSection, DocTable, Inline } from "~~/components/docs/DocsParts";
import { REPO } from "~~/components/docs/nav";

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3 rounded-2xl border border-base-300 bg-base-200 p-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
      {n}
    </span>
    <span>{children}</span>
  </li>
);

const ArchitecturePage: NextPage = () => (
  <>
    <DocHeader title="Architecture" summary="How the contract and the frontend fit together." />

    <DocSection title="Overview">
      <p>
        The browser reads <b>market data</b> from SaucerSwap&apos;s REST API, <b>account state</b> from the mirror node
        and <b>prices</b> from the on-chain QuoterV2. It sends <b>transactions</b> only to <Inline>SwapHelper</Inline>,
        which calls the SaucerSwap router.
      </p>
    </DocSection>

    <DocSection title="The contract">
      <DocTable
        head={["Function", "What it does"]}
        rows={[
          ["swapExactHbarForTokens", "HBAR in. Sends the value to the router, which wraps it."],
          ["swapExactTokensForTokens", "Pulls the input token, approves the router, swaps."],
          ["swapExactTokensForHbar", "Swaps to WHBAR, unwraps through the router, forwards the HBAR."],
          ["associate(token)", "Associates the contract with an HTS token. A no-op if already associated."],
          ["setFee, withdrawTokenFees, withdrawHbarFees", "Owner only."],
          ["encodePath(tokens, fees)", "Packs tokens and pool fees into SaucerSwap's path format."],
        ]}
      />
      <p>
        It holds no user funds between transactions, uses a reentrancy guard and safe token transfers, validates the
        path, and relies on the router for slippage and deadline checks.
      </p>
    </DocSection>

    <DocSection title="A swap, step by step">
      <ol className="space-y-2">
        <Step n={1}>
          <Inline>useTokenList</Inline> and <Inline>usePools</Inline> load tokens and pools from SaucerSwap.
        </Step>
        <Step n={2}>
          <Inline>useRoute</Inline> picks the pool with the most liquidity, or two hops through WHBAR.
        </Step>
        <Step n={3}>
          <Inline>useQuote</Inline> removes the integrator fee, asks QuoterV2 for the output, and compares with a 1%
          reference trade to get the price impact.
        </Step>
        <Step n={4}>
          <Inline>useAssociation</Inline> asks the mirror node whether the wallet or SwapHelper holds the token. If not,{" "}
          <Inline>AssociateButton</Inline> offers one click.
        </Step>
        <Step n={5}>
          <Inline>useSwap</Inline> approves SwapHelper if needed, calls the right function, converts HBAR to weibar and
          waits for the receipt.
        </Step>
        <Step n={6}>
          <Inline>TxStatus</Inline> shows each stage with a Hashscan link. <Inline>SwapHistory</Inline> reads the{" "}
          <Inline>Swapped</Inline> events from the mirror node.
        </Step>
      </ol>
    </DocSection>

    <DocSection title="Where state lives">
      <DocTable
        head={["Concern", "Source"]}
        rows={[
          ["Tokens, pools, prices", "SaucerSwap REST API, cached with React Query"],
          ["Balances, association, history", "Mirror node, plus the wallet for HBAR"],
          ["Quotes", "QuoterV2 on chain, refreshed every 15 seconds"],
          ["SwapHelper address and ABI", "contracts/deployedContracts.ts, written by the deploy"],
          ["Per-network ids and endpoints", "utils/swap/config.ts"],
        ]}
      />
      <p>
        Sequence and flow diagrams are in the{" "}
        <a className="link" href={`${REPO}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer">
          architecture guide on GitHub
        </a>
        .
      </p>
    </DocSection>
  </>
);

export default ArchitecturePage;
