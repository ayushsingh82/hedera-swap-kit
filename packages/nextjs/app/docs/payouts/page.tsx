import Link from "next/link";
import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, DocTable, Inline } from "~~/components/docs/DocsParts";
import { PAYOUT_TX } from "~~/components/docs/nav";

const PayoutsDocsPage: NextPage = () => (
  <>
    <DocHeader
      title="Payouts"
      summary="Pay many people in one transaction, each in the token they want. One signature, one Hashscan link."
    />

    <DocSection title="How it works">
      <p>
        You fund a batch with HBAR. <Inline>BatchPayout</Inline> swaps for each recipient through{" "}
        <Inline>SwapHelper</Inline> (or sends plain HBAR when the token is HBAR) and tags every event with a reference
        such as <Inline>2026-10 payroll</Inline>.
      </p>
      <p>
        A payment that fails does not sink the batch: its HBAR is refunded to you when the batch ends and an event says
        which one failed.
      </p>
    </DocSection>

    <DocSection title="Use the page">
      <p>
        Open{" "}
        <Link className="link" href="/payouts">
          /payouts
        </Link>{" "}
        and paste one payout per line:
      </p>
      <CodeBlock
        language="bash"
        code={`# address, HBAR to spend, token (optional)
0x846Ff469eC6e8592ae71D9D52999b89534639B3A, 0.5, SAUCE
0x1d17866a4B81d16A6B1a83338c9A11Bf56141d09, 0.3, HBAR`}
      />
      <p>
        The amount is the HBAR you spend on that payment. The token is a symbol or Hedera id, or HBAR for a plain
        transfer. Leave it out to use the default token. Commas, tabs or semicolons all work, and a header line is
        skipped. The page checks every row before you send it:
      </p>
      <DocTable
        head={["Status", "Meaning"]}
        rows={[
          ["Ready", "A route with liquidity and a quote exist, and the recipient can receive the token."],
          [
            "No account",
            "The address has no Hedera account yet. Paying it would abort the whole batch, so it is left out.",
          ],
          ["Not associated", "The recipient does not allow automatic associations and has not associated the token."],
          ["No route / No quote", "No pool with liquidity connects HBAR to that token."],
          ["Fix this row", "The address or amount could not be read."],
        ]}
      />
    </DocSection>

    <DocSection title="Call the contract">
      <CodeBlock
        code={`const payments = [
  { recipient: alice, amountIn, minOut, path },       // swap HBAR to a token
  { recipient: bob, amountIn, minOut: 0n, path: "0x" }, // plain HBAR
];

await batchPayout.payout(payments, batchId, deadline, { value: total });`}
      />
      <p>
        <Inline>value</Inline> must equal the sum of every <Inline>amountIn</Inline>, with at most 50 payments. A
        successful run is{" "}
        <a className="link" href={PAYOUT_TX} target="_blank" rel="noreferrer">
          on Hashscan
        </a>
        .
      </p>
    </DocSection>

    <DocSection title="What it costs">
      <p>
        On testnet a batch of two swaps used about 1.1M gas, so budget roughly 0.5M gas per payment (about 0.4 HBAR
        each) on top of the HBAR you pay out. The account sending the batch must hold the gas limit times the max fee up
        front.
      </p>
    </DocSection>
  </>
);

export default PayoutsDocsPage;
