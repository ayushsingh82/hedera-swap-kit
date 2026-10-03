"use client";

import { useAssociation } from "~~/hooks/swap";
import { SwapToken } from "~~/utils/swap/tokens";

type AssociateButtonProps = {
  token?: SwapToken;
  /** "wallet" associates the connected account (to receive a token). "helper" associates SwapHelper (to pay with it). */
  subject: "wallet" | "helper";
};

/**
 * Renders nothing when the token needs no association. Otherwise it explains why and associates in one click.
 * Hedera accounts and contracts must be associated with an HTS token before they can hold it.
 */
export const AssociateButton = ({ token, subject }: AssociateButtonProps) => {
  const { isAssociated, isLoading, isAssociating, error, associate } = useAssociation(token, subject);

  if (!token || isLoading || isAssociated !== false) return null;

  const reason =
    subject === "wallet"
      ? `Your account must be associated with ${token.symbol} before it can receive it.`
      : `The swap contract must be associated with ${token.symbol} once before it can swap it.`;

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
      <p>{reason}</p>
      <button type="button" className="btn btn-warning btn-sm mt-2" disabled={isAssociating} onClick={associate}>
        {isAssociating && <span className="loading loading-spinner loading-xs" />}
        Associate {token.symbol}
      </button>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
};
