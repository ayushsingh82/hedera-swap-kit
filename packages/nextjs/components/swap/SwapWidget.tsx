"use client";

import { useEffect, useMemo, useState } from "react";
import { AmountInput } from "./AmountInput";
import { AssociateButton } from "./AssociateButton";
import { QuoteDetails } from "./QuoteDetails";
import { DEFAULT_SETTINGS, SlippageSettings, SwapSettings } from "./SlippageSettings";
import { TokenIcon, TokenSelect } from "./TokenSelect";
import { TxStatus } from "./TxStatus";
import { useAccount } from "wagmi";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import {
  useAssociation,
  useQuote,
  useRoute,
  useSwap,
  useSwapHelper,
  useSwapNetwork,
  useTokenBalances,
  useTokenList,
} from "~~/hooks/swap";
import { applySlippage, formatAmount, parseAmount } from "~~/utils/swap/math";
import { HBAR, SwapToken } from "~~/utils/swap/tokens";

/** HBAR kept back when swapping the whole balance, so the account can still pay transaction fees. */
const GAS_RESERVE = 100_000_000n;
const HIGH_IMPACT_PERCENT = 5;

export type SwapWidgetProps = {
  title?: string;
  /** Token to receive when the list loads: a Hedera id such as "0.0.1183558", or a symbol such as "SAUCE". */
  defaultTokenOut?: string;
  /** Hides the output token picker, for a fixed target such as a checkout or a token page. */
  lockTokenOut?: boolean;
  /** Sends the output to this account instead of the connected wallet, for example a merchant. */
  recipient?: `0x${string}`;
  buttonLabel?: string;
};

/**
 * The drop-in swap widget. It composes the token pickers, amount fields, quote, association checks and
 * transaction status, and talks to the deployed SwapHelper. Use it as is, or copy it and rearrange the parts.
 */
export const SwapWidget = ({
  title = "Swap",
  defaultTokenOut,
  lockTokenOut = false,
  recipient,
  buttonLabel = "Swap",
}: SwapWidgetProps) => {
  const network = useSwapNetwork();
  const { address: account } = useAccount();
  const { tokens } = useTokenList();
  const { balanceOf, refetch: refetchBalances } = useTokenBalances();
  const { isDeployed, feeBps } = useSwapHelper();
  const { swap, reset, status, hash, error, isBusy } = useSwap();

  const [tokenIn, setTokenIn] = useState<SwapToken>(HBAR);
  const [tokenOut, setTokenOut] = useState<SwapToken>();
  const [amount, setAmount] = useState("");
  const [settings, setSettings] = useState<SwapSettings>(DEFAULT_SETTINGS);

  // Default the output to SAUCE (or the first token) once the list loads, and refresh HBAR's price with it.
  useEffect(() => {
    if (!tokens.length) return;
    setTokenIn(current => tokens.find(t => t.id === current.id) ?? current);
    setTokenOut(
      current =>
        current ??
        tokens.find(t => t.id === defaultTokenOut || t.symbol === defaultTokenOut) ??
        tokens.find(t => t.symbol === "SAUCE") ??
        tokens[1],
    );
  }, [tokens, defaultTokenOut]);

  const amountIn = parseAmount(amount, tokenIn.decimals);
  const { route, isLoading: routeLoading } = useRoute(tokenIn, tokenOut);
  const { data: quote, isFetching: quoting, error: quoteError } = useQuote(route, amountIn);

  const wallet = useAssociation(tokenOut, "wallet", recipient);
  const helper = useAssociation(tokenIn, "helper");

  const routeSymbols = useMemo(() => {
    if (!route) return [];
    const symbolOf = (id: string) => (id === network.whbarId ? "HBAR" : (tokens.find(t => t.id === id)?.symbol ?? id));
    return route.tokens.map(symbolOf);
  }, [route, tokens, network.whbarId]);

  const balanceIn = balanceOf(tokenIn);
  const maxIn =
    balanceIn === undefined
      ? undefined
      : tokenIn.isNative
        ? balanceIn > GAS_RESERVE
          ? balanceIn - GAS_RESERVE
          : 0n
        : balanceIn;
  const insufficient = amountIn !== undefined && balanceIn !== undefined && amountIn > balanceIn;
  const highImpact = (quote?.priceImpact ?? 0) >= HIGH_IMPACT_PERCENT;

  const flip = () => {
    if (!tokenOut) return;
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmount(quote ? formatAmount(quote.amountOut, tokenOut.decimals, tokenOut.decimals) : "");
    reset();
  };

  const onSwap = async () => {
    if (!tokenOut || !route || !quote || !amountIn) return;
    const hashOrUndefined = await swap({
      tokenIn,
      tokenOut,
      route,
      amountIn,
      amountOutMinimum: applySlippage(quote.amountOut, settings.slippageBps),
      deadlineSeconds: BigInt(settings.deadlineMinutes * 60),
      recipient,
    });
    if (hashOrUndefined) {
      setAmount("");
      refetchBalances();
    }
  };

  // The first reason the swap cannot run yet, shown on the main button.
  const blocker = (() => {
    if (!isDeployed) return "SwapHelper is not deployed on this network";
    if (!tokenOut) return "Select a token";
    if (!amountIn) return amount ? "Enter a valid amount" : "Enter an amount";
    if (insufficient) return `Insufficient ${tokenIn.symbol} balance`;
    if (routeLoading) return "Finding a route…";
    if (!route) return "No route with liquidity";
    if (quoteError) return "Could not get a quote";
    if (!quote) return "Getting a quote…";
    if (wallet.isAssociated === false)
      return recipient
        ? `The receiver is not associated with ${tokenOut.symbol}`
        : `Associate ${tokenOut.symbol} first`;
    if (helper.isAssociated === false) return `Associate ${tokenIn.symbol} with the swap contract first`;
    return undefined;
  })();

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-base-300 bg-base-100 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <SlippageSettings value={settings} onChange={setSettings} />
      </div>

      <AmountInput
        label="You pay"
        value={amount}
        onChange={value => {
          setAmount(value);
          if (status !== "idle" && !isBusy) reset();
        }}
        token={tokenIn}
        balance={balanceIn}
        onMax={
          maxIn === undefined ? undefined : () => setAmount(formatAmount(maxIn, tokenIn.decimals, tokenIn.decimals))
        }
        tokenSelect={
          <TokenSelect
            tokens={tokens}
            value={tokenIn}
            onChange={setTokenIn}
            balanceOf={balanceOf}
            disabledToken={tokenOut}
          />
        }
      />

      <div className="relative z-[1] -my-3 flex justify-center">
        <button
          type="button"
          className="btn btn-sm btn-circle border-4 border-base-100"
          aria-label="Flip tokens"
          onClick={flip}
        >
          <ArrowsUpDownIcon className="h-4 w-4" />
        </button>
      </div>

      <AmountInput
        label="You receive"
        value={quote ? formatAmount(quote.amountOut, tokenOut?.decimals ?? 0, tokenOut?.decimals) : ""}
        token={tokenOut}
        balance={tokenOut ? balanceOf(tokenOut) : undefined}
        readOnly
        loading={quoting}
        tokenSelect={
          lockTokenOut ? (
            tokenOut && (
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-base-100 px-3 py-1 text-sm font-semibold">
                <TokenIcon token={tokenOut} size={20} />
                {tokenOut.symbol}
              </span>
            )
          ) : (
            <TokenSelect
              tokens={tokens}
              value={tokenOut}
              onChange={setTokenOut}
              balanceOf={balanceOf}
              disabledToken={tokenIn}
            />
          )
        }
      />

      <div className="mt-3 space-y-3">
        {quote && tokenOut && route && amountIn && (
          <QuoteDetails
            quote={quote}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            amountIn={amountIn}
            route={route}
            routeSymbols={routeSymbols}
            slippageBps={settings.slippageBps}
            feeBps={feeBps}
          />
        )}
        {highImpact && (
          <p role="alert" className="text-sm text-error">
            Price impact is very high. You will get much less than the market rate.
          </p>
        )}

        {!recipient && <AssociateButton token={tokenOut} subject="wallet" />}
        <AssociateButton token={tokenIn} subject="helper" />
        <TxStatus status={status} hash={hash} error={error} />

        {account ? (
          <button
            type="button"
            className={`btn w-full ${highImpact ? "btn-error" : "btn-primary"}`}
            disabled={!!blocker || isBusy}
            onClick={onSwap}
          >
            {isBusy && <span className="loading loading-spinner loading-sm" />}
            {blocker ?? (highImpact ? `${buttonLabel} anyway` : buttonLabel)}
          </button>
        ) : (
          <div className="flex justify-center">
            <RainbowKitCustomConnectButton />
          </div>
        )}
      </div>
    </div>
  );
};
