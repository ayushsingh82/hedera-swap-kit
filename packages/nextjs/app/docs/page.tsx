import type { NextPage } from "next";
import { CodeBlock } from "~~/components/CodeBlock";
import { DocHeader, DocSection, Inline } from "~~/components/docs/DocsParts";
import { SWAP_TX } from "~~/components/docs/nav";

const QuickstartPage: NextPage = () => (
  <>
    <DocHeader
      title="Quickstart"
      summary="Create a project from the template, deploy SwapHelper to testnet and start the app."
    />

    <DocSection title="Create the project">
      <CodeBlock
        language="bash"
        code={`npm create scaffold-hbar@latest my-swap-app -- --template ayushsingh82/hedera-swap-kit
cd my-swap-app
npm install --legacy-peer-deps`}
      />
      <p>
        The CLI asks for the frontend, Solidity framework, network and package manager. This template supports Next.js
        and Hardhat.
      </p>
    </DocSection>

    <DocSection title="Deploy to testnet">
      <CodeBlock
        language="bash"
        code={`npm run hardhat:account:generate     # then fund the address at portal.hedera.com/faucet
npm run hardhat:deploy -- --network hederaTestnet`}
      />
      <p>
        The deploy writes the contract address to <Inline>packages/nextjs/contracts/deployedContracts.ts</Inline>, so
        the app finds it by itself.
      </p>
    </DocSection>

    <DocSection title="Run the app">
      <CodeBlock language="bash" code="npm run next:dev" />
      <p>
        Open <Inline>/swap</Inline>, connect a wallet on Hedera Testnet and swap. If a token needs association, the
        widget shows an <b>Associate</b> button first.
      </p>
    </DocSection>

    <DocSection title="Run a swap from the command line">
      <CodeBlock language="bash" code="npm run hardhat:swap-testnet" />
      <p>
        It swaps 1 HBAR for SAUCE through the deployed <Inline>SwapHelper</Inline> and prints a Hashscan link. See a
        real one:{" "}
        <a className="link" href={SWAP_TX} target="_blank" rel="noreferrer">
          proof swap on Hashscan
        </a>
        .
      </p>
    </DocSection>
  </>
);

export default QuickstartPage;
