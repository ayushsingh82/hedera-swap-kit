import type { NextPage } from "next";
import { DocHeader, DocSection, Inline } from "~~/components/docs/DocsParts";

const items: [string, React.ReactNode][] = [
  [
    "SwapHelper is not deployed on Hedera Testnet",
    <>
      Run <Inline>npm run hardhat:deploy -- --network hederaTestnet</Inline>. The deploy writes the address to{" "}
      <Inline>deployedContracts.ts</Inline>.
    </>,
  ],
  [
    "The swap reverts with no reason",
    "Check, in order: the recipient is associated with the output token; for token inputs, SwapHelper is associated with the input token and you approved it; the deadline has not passed; slippage is not too tight for a thin pool.",
  ],
  [
    "No route",
    "No pool with liquidity connects the pair. Testnet liquidity is thin: try HBAR to SAUCE, or add liquidity in the SaucerSwap app.",
  ],
  [
    "Token to HBAR costs more",
    "HTS transfers are gas heavy. On testnet a token to HBAR swap used about 1.7M gas (about 1.4 HBAR), against about 0.2M for HBAR to token. Hedera bills gas used, not the limit.",
  ],
  [
    "Out of gas or insufficient balance",
    "The account needs HBAR for fees. When you swap your whole balance, the widget keeps 1 HBAR back for this.",
  ],
  [
    "Block Explorer says targetNetwork is not localhost",
    "That page only works against a local Hardhat node. On testnet or mainnet, use Hashscan.",
  ],
  [
    "An auto-buy run did not happen",
    "The contract must hold the gas limit times the gas price when a run executes. If its balance is too low the network cannot run it. A plan whose next run could not be scheduled shows as paused: press Resume. A run that fails the minimum output is skipped and its HBAR stays in the plan.",
  ],
  ["Wrong network", "The widget reads the wallet's chain. Switch to Hedera Testnet (296) or Mainnet (295)."],
];

const TroubleshootingPage: NextPage = () => (
  <>
    <DocHeader title="Troubleshooting" summary="The problems people hit most, and what to check." />
    {items.map(([title, body]) => (
      <DocSection key={title} title={title}>
        <p>{body}</p>
      </DocSection>
    ))}
  </>
);

export default TroubleshootingPage;
