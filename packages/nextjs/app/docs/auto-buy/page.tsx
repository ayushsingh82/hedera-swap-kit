import Link from "next/link";
import type { NextPage } from "next";
import { DocHeader, DocSection, DocTable, Inline } from "~~/components/docs/DocsParts";

const AutoBuyDocsPage: NextPage = () => (
  <>
    <DocHeader
      title="Auto-buy"
      summary="Buy a token on a schedule. The Hedera Schedule Service runs every purchase, so there is no bot."
    />

    <DocSection title="How it works">
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          On{" "}
          <Link className="link" href="/dca">
            /dca
          </Link>{" "}
          you pick a token, the HBAR to spend per run, how often, and how many runs. You send the swap budget plus an
          automation fee for each run.
        </li>
        <li>
          <Inline>ScheduledSwap</Inline> schedules the first run through the Schedule Service (system contract{" "}
          <Inline>0x16b</Inline>).
        </li>
        <li>
          Each run swaps through <Inline>SwapHelper</Inline>, sends the tokens to you and schedules the next run before
          it ends.
        </li>
      </ol>
    </DocSection>

    <DocSection title="When something goes wrong">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          A swap that fails (the price moved below your minimum) is skipped. Its HBAR stays in the plan and the plan
          carries on.
        </li>
        <li>If the Schedule Service refuses to schedule the next run, the plan pauses and you can resume it.</li>
        <li>Cancel any time to get the unspent budget back. The automation fee is not refunded.</li>
        <li>Only the contract itself can trigger a run, and the owner can never withdraw escrowed budget.</li>
      </ul>
    </DocSection>

    <DocSection title="What it costs">
      <DocTable
        head={["Cost", "Amount (testnet)"]}
        rows={[
          ["Creating a plan", "About 1.5M gas, about 1.3 HBAR. Scheduling the first run is gas heavy."],
          ["Automation fee", "1.3 HBAR per run, set by the contract owner."],
          ["Gas limit of a run that reschedules", "2M. Rescheduling used about 1.4M gas."],
          ["Gas limit of the final run", "0.8M. It only swaps."],
        ]}
      />
      <p>
        The contract must hold the gas limit times the gas price (84 tinybar per gas) when a run executes, even if the
        run uses less. That is why the fee is collected up front.
      </p>
    </DocSection>
  </>
);

export default AutoBuyDocsPage;
