"use client";

import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { TokenSelect } from "~~/components/swap";
import { useTokenList } from "~~/hooks/swap";
import { HBAR, SwapToken } from "~~/utils/swap/tokens";

/** Builds a /pay link: the merchant's address, the token they want to receive, and an optional label and order id. */
export const PaymentLinkBuilder = () => {
  const { tokens } = useTokenList();
  const [to, setTo] = useState("");
  const [token, setToken] = useState<SwapToken>(HBAR);
  const [label, setLabel] = useState("");
  const [order, setOrder] = useState("");
  const [copied, setCopied] = useState(false);

  const valid = isAddress(to);
  const link = useMemo(() => {
    if (!valid || typeof window === "undefined") return "";
    const params = new URLSearchParams({ to, token: token.id });
    if (label) params.set("label", label);
    if (order) params.set("order", order);
    return `${window.location.origin}/pay?${params.toString()}`;
  }, [valid, to, token, label, order]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the link stays selectable.
    }
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded-3xl border border-base-300 bg-base-100 p-5 shadow-xl">
      <h2 className="text-lg font-bold">Create a payment link</h2>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Your address (the receiver)</span>
        <input
          className={`input input-bordered w-full font-mono text-sm ${to && !valid ? "input-error" : ""}`}
          placeholder="0x..."
          value={to}
          onChange={e => setTo(e.target.value.trim())}
        />
        {to && !valid && <span className="mt-1 block text-xs text-error">Enter a valid EVM address</span>}
      </label>
      <div className="text-sm">
        <span className="mb-1 block font-medium">You want to receive</span>
        <TokenSelect tokens={tokens} value={token} onChange={setToken} />
        <p className="mt-1 text-xs opacity-60">
          Your account must be associated with this token. HBAR needs no association.
        </p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Shop name (optional)</span>
        <input className="input input-bordered w-full" value={label} onChange={e => setLabel(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Order id (optional)</span>
        <input className="input input-bordered w-full" value={order} onChange={e => setOrder(e.target.value)} />
      </label>
      {link && (
        <div className="rounded-2xl bg-base-200 p-3">
          <p className="break-all font-mono text-xs">{link}</p>
          <button type="button" className="btn btn-sm btn-primary mt-3 gap-1" onClick={copy}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
};
