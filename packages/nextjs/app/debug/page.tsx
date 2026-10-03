import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Debug Contracts",
  description: "Read and write your deployed SwapHelper contract from the browser",
});

const Debug: NextPage = () => {
  return (
    <>
      <DebugContracts />
      <div className="mx-auto mt-8 w-full max-w-3xl px-4 pb-12 text-center">
        <h1 className="text-3xl font-bold">Debug Contracts</h1>
        <p className="mt-2 text-sm opacity-70">
          Read and write every function of your deployed contracts, straight from the browser. Connect a wallet on the
          network you deployed to.
        </p>
        <ul className="mt-5 grid gap-3 text-left text-sm sm:grid-cols-3">
          {[
            ["Read", "Check feeBps, the owner and the router and WHBAR addresses."],
            ["Write", "As the owner, call setFee, withdrawTokenFees and withdrawHbarFees. Anyone can call associate."],
            ["Edit", "The contract UI is generated from deployedContracts.ts. Redeploy to refresh it."],
          ].map(([title, text]) => (
            <li key={title} className="rounded-2xl border border-base-300 bg-base-200 p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 opacity-70">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Debug;
