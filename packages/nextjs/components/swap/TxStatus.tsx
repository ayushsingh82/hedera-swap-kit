"use client";

import { useSwapNetwork } from "~~/hooks/swap";
import type { SwapStatus } from "~~/hooks/swap";
import { hashscanTx } from "~~/utils/swap/config";

type TxStatusProps = {
  status: SwapStatus;
  hash?: string;
  error?: string;
};

const PENDING_TEXT: Partial<Record<SwapStatus, string>> = {
  approving: "Approve the token in your wallet…",
  swapping: "Confirm the swap in your wallet…",
  confirming: "Waiting for the network to confirm…",
};

/** Pending, success and error states for a swap, with a Hashscan link once there is a transaction. */
export const TxStatus = ({ status, hash, error }: TxStatusProps) => {
  const network = useSwapNetwork();
  if (status === "idle") return null;

  const link = hash && (
    <a href={hashscanTx(network, hash)} target="_blank" rel="noreferrer" className="link font-medium">
      View on Hashscan
    </a>
  );

  if (status === "success") {
    return (
      <div role="status" className="alert alert-success text-sm">
        <span>Swap confirmed. {link}</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div role="alert" className="alert alert-error text-sm">
        <span className="break-words">
          {error ?? "The swap failed."} {link}
        </span>
      </div>
    );
  }
  return (
    <div role="status" className="alert alert-info text-sm">
      <span className="loading loading-spinner loading-sm" />
      <span>
        {PENDING_TEXT[status]} {link}
      </span>
    </div>
  );
};
