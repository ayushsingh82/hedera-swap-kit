import type { NextPage } from "next";

const REPO = "https://github.com/ayushsingh82/hedera-swap-kit";

type Row = [name: string, description: string];

const components: Row[] = [
  ["SwapWidget", "The drop-in widget. No props. Composes everything below and swaps through SwapHelper."],
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

const hooks: Row[] = [
  [
    "useSwap()",
    "Approves SwapHelper if needed, sends the right swap, waits for the receipt. Returns swap, status, hash, error.",
  ],
  ["useQuote(route, amountIn)", "Quotes through QuoterV2 every 15 seconds. Returns amountOut, fee and price impact."],
  ["useRoute(tokenIn, tokenOut)", "Best route from live liquidity: a direct pool, or two hops through WHBAR."],
  ["useTokenList()", "HBAR first, then every SaucerSwap token that has a V2 pool."],
  ["useTokenBalances()", "HBAR from the wallet, HTS tokens from the mirror node."],
  ["useAssociation(token, subject)", "Whether the wallet or SwapHelper is associated, and a way to associate."],
  ["useSwapHistory(limit?)", "Recent swaps for the account from the mirror node's contract logs."],
  ["usePools()", "All V2 pools for the current network."],
  ["useSwapHelper()", "Address and integrator fee of the deployed SwapHelper."],
  ["useSwapNetwork()", "SaucerSwap, mirror node and Hashscan endpoints for the wallet's chain."],
];

const customize: Row[] = [
  [
    "Change the fee",
    "Call setFee(bps) as the owner, up to 100 (1%). Fees accrue in SwapHelper; collect with withdrawTokenFees or withdrawHbarFees.",
  ],
  [
    "Add a token",
    "Any token with a SaucerSwap V2 pool appears automatically. To restrict the list, filter in buildTokenList (utils/swap/tokens.ts).",
  ],
  [
    "Add a pool",
    "Create liquidity in the SaucerSwap app. Once a pool has liquidity, /pools and the route finder pick it up.",
  ],
  [
    "Swap the DEX out",
    "Update the addresses, the router and quoter ABIs, and the data hooks. SwapHelper only needs exactInput, unwrapWHBAR and multicall.",
  ],
  [
    "Go to mainnet",
    "Ids are already in the config. Run npm run hardhat:deploy -- --network hederaMainnet, then switch the wallet to chain 295.",
  ],
];

const sections = [
  { id: "quickstart", title: "Quickstart" },
  { id: "how-it-works", title: "How swaps work on Hedera" },
  { id: "components", title: "Components" },
  { id: "hooks", title: "Hooks" },
  { id: "customize", title: "Customize" },
  { id: "more", title: "Full docs" },
];

const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-xl bg-base-200 p-4 text-sm">
    <code>{children}</code>
  </pre>
);

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="mb-3 text-2xl font-bold">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

const Table = ({ rows, head }: { rows: Row[]; head: [string, string] }) => (
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

const DocsPage: NextPage = () => (
  <div className="mx-auto flex w-full max-w-6xl grow flex-col gap-8 px-4 py-10 lg:flex-row">
    <nav aria-label="Docs sections" className="shrink-0 lg:sticky lg:top-24 lg:w-56 lg:self-start">
      <p className="mb-2 text-xs font-semibold uppercase opacity-60">On this page</p>
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
        {sections.map(({ id, title }) => (
          <li key={id}>
            <a href={`#${id}`} className="block rounded-full px-3 py-1 text-sm hover:bg-primary/5">
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>

    <div className="min-w-0 grow space-y-12">
      <div>
        <h1 className="text-3xl font-bold">Docs</h1>
        <p className="mt-1 text-sm opacity-70">
          Everything you need to use and customize hedera-swap-kit. The full guides are in the repository.
        </p>
      </div>

      <Section id="quickstart" title="Quickstart">
        <p>Create a project from the template, deploy SwapHelper to testnet and start the app.</p>
        <Code>{`npm create scaffold-hbar@latest my-swap-app -- --template ayushsingh82/hedera-swap-kit
cd my-swap-app

npm run hardhat:account:generate        # then fund it at portal.hedera.com/faucet
npm run hardhat:deploy -- --network hederaTestnet
npm run next:dev`}</Code>
        <p>
          Open <code className="font-mono">/swap</code>, connect a wallet on Hedera Testnet and swap. To run one swap
          from the command line and get a Hashscan link, use{" "}
          <code className="font-mono">npm run hardhat:swap-testnet</code>.
        </p>
      </Section>

      <Section id="how-it-works" title="How swaps work on Hedera">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>WHBAR.</b> Pools trade WHBAR, not HBAR. HBAR in is sent as the transaction value and the router wraps it.
            HBAR out is unwrapped by the router. You never wrap by hand.
          </li>
          <li>
            <b>Association.</b> An account must be associated with an HTS token before it can hold it. The recipient
            needs the token it receives. SwapHelper needs the token it is paid with. HBAR needs neither.
          </li>
          <li>
            <b>Tinybar vs weibar.</b> HBAR has 8 decimals in contracts (tinybar) but 18 in JSON-RPC transaction values
            (weibar). One tinybar is 10<sup>10</sup> weibar. The kit converts when it sends a transaction.
          </li>
          <li>
            <b>Integrator fee.</b> An optional fee (up to 1%) is taken from the input and kept in the contract for the
            owner to withdraw.
          </li>
        </ul>
      </Section>

      <Section id="components" title="Components">
        <p>
          In <code className="font-mono">components/swap/</code>. Import from{" "}
          <code className="font-mono">~~/components/swap</code>.
        </p>
        <Table rows={components} head={["Component", "What it does"]} />
        <Code>{`import { SwapWidget } from "~~/components/swap";

export default function Page() {
  return <SwapWidget />;
}`}</Code>
      </Section>

      <Section id="hooks" title="Hooks">
        <p>
          In <code className="font-mono">hooks/swap/</code>. Amounts are <code className="font-mono">bigint</code> in
          the token&apos;s smallest unit (tinybar for HBAR).
        </p>
        <Table rows={hooks} head={["Hook", "What it does"]} />
        <Code>{`const { swap, status, hash, error } = useSwap();

await swap({
  tokenIn,
  tokenOut,
  route,
  amountIn,
  amountOutMinimum: applySlippage(quote.amountOut, 50), // 0.5%
});`}</Code>
      </Section>

      <Section id="customize" title="Customize">
        <Table rows={customize} head={["Task", "How"]} />
      </Section>

      <Section id="more" title="Full docs">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a className="link" href={`${REPO}#readme`} target="_blank" rel="noreferrer">
              README
            </a>{" "}
            for setup, env vars and troubleshooting
          </li>
          <li>
            <a className="link" href={`${REPO}/blob/main/docs/components.md`} target="_blank" rel="noreferrer">
              Components and hooks
            </a>{" "}
            with every prop
          </li>
          <li>
            <a className="link" href={`${REPO}/blob/main/docs/customize.md`} target="_blank" rel="noreferrer">
              Customize
            </a>{" "}
            step by step
          </li>
          <li>
            <a className="link" href={`${REPO}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer">
              Architecture
            </a>{" "}
            with contract and frontend flow diagrams
          </li>
        </ul>
      </Section>
    </div>
  </div>
);

export default DocsPage;
