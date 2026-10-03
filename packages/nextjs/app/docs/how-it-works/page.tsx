import type { NextPage } from "next";
import { DocHeader, DocSection, DocTable, Inline } from "~~/components/docs/DocsParts";

const HowItWorksPage: NextPage = () => (
  <>
    <DocHeader
      title="How swaps work on Hedera"
      summary="Three things that make Hedera different from Ethereum, and how the template handles each."
    />

    <DocSection title="WHBAR">
      <p>
        Pools trade <b>WHBAR</b>, an HTS token that stands in for HBAR. You never wrap by hand.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>HBAR in:</b> the swap sends HBAR as the transaction value and the router wraps it. The path starts with the
          WHBAR token.
        </li>
        <li>
          <b>HBAR out:</b> the router swaps to WHBAR, then unwraps it to <Inline>SwapHelper</Inline>, which forwards the
          HBAR. The path ends with the WHBAR token.
        </li>
      </ul>
      <p>The address used in paths is the WHBAR token (0.0.15058 on testnet), not the WHBAR contract.</p>
    </DocSection>

    <DocSection title="Association">
      <p>
        An account must be associated with an HTS token before it can hold it. Accounts created recently allow{" "}
        <b>automatic associations</b> (<Inline>max_automatic_token_associations</Inline> of -1 means unlimited), so the
        token is associated when it first arrives and no step is needed. Older accounts, or accounts that turned it off,
        must associate first. The kit reads this from the mirror node and only asks when it is needed.
      </p>
      <DocTable
        head={["When you are", "Who must be associated"]}
        rows={[
          [
            "Swapping to a token",
            "The recipient, usually your wallet. The Associate button calls associate() on the token.",
          ],
          [
            "Swapping from a token",
            "SwapHelper, because it pulls the token before swapping. Call SwapHelper.associate(token) once.",
          ],
          ["Using native HBAR", "Nobody."],
        ]}
      />
    </DocSection>

    <DocSection title="Tinybar vs weibar">
      <p>
        HBAR has 8 decimals (tinybar) inside contracts, but JSON-RPC transaction values use 18 decimals (weibar). One
        tinybar is 10<sup>10</sup> weibar. Every amount in the kit is in tinybar, and <Inline>useSwap</Inline> converts
        when it sends a transaction value.
      </p>
    </DocSection>

    <DocSection title="The path">
      <p>
        SaucerSwap V2 describes a route as packed bytes: token (20 bytes), pool fee (3 bytes), token, and so on. Fees
        are in hundredths of a basis point: 500 is 0.05%, 3000 is 0.30%, 10000 is 1%.
      </p>
    </DocSection>

    <DocSection title="The integrator fee">
      <p>
        <Inline>feeBps</Inline> is 0 by default and capped at 100 (1%). It is taken from the input and kept in the
        contract for the owner to withdraw. It accrues instead of paying out per swap because a transfer to an
        unassociated account reverts on Hedera.
      </p>
    </DocSection>
  </>
);

export default HowItWorksPage;
