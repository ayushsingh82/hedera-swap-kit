# Use cases

Five ready-made flows, each a page, a contract path and a transaction you can check on Hashscan. Every one runs on Hedera testnet today.

| Use case | Route | Contract | Command-line demo |
| --- | --- | --- | --- |
| [Swap](#swap) | `/swap` | `SwapHelper` | `npm run demo:swap` |
| [Pay in any token](#pay-in-any-token) | `/pay` | `SwapHelper` | `npm run demo:pay` |
| [Payouts](#payouts) | `/payouts` | `BatchPayout` | `npm run demo:payout` |
| [Auto-buy](#auto-buy) | `/dca` | `ScheduledSwap` | `npm run demo:dca` |
| [Buy a token](#buy-a-token) | `/buy` | `SwapHelper` | n/a |

Run `npm run init` and `npm run deploy:testnet` first, then `npm run doctor` to check the setup.

## Swap

HBAR to token, token to token and token to HBAR through SaucerSwap V2. See the [README](../README.md#how-swaps-work-on-hedera) for how WHBAR, association and tinybar vs weibar are handled.

## Pay in any token

A checkout where the buyer pays with any token and the receiver gets the token they chose.

1. The receiver opens `/pay`, enters their address and the token they want, and copies the link.
2. The buyer opens it, picks what to pay with and pays.
3. The swap runs through `SwapHelper` with the receiver as `recipient`, so the tokens go straight to them.

```
/pay?to=0x...&token=0.0.1183558&label=Cafe&order=1042
```

| Parameter | Meaning |
| --- | --- |
| `to` | Receiver address (EVM). Required. |
| `token` | Token the receiver gets: a Hedera id or `HBAR`. Default `HBAR`. |
| `label`, `order` | Shop name and order id shown to the buyer. Optional. |

Embed it:

```tsx
<SwapWidget title="Pay" defaultTokenOut="0.0.1183558" lockTokenOut recipient={shop} buttonLabel="Pay" />
```

Limits: the buyer sets what they pay and the receiver gets the quoted amount at that moment (an exact amount for the receiver needs an exact-output swap, which this version does not have). The order id is shown in the page and is not recorded on-chain yet.

## Payouts

Pay many people in one transaction, each in the token they want.

`BatchPayout.payout(payments, batchId, deadline)` takes up to 50 payments. Each is `{ recipient, amountIn, minOut, path }`: the HBAR to spend, the least the recipient must receive, and a SaucerSwap path that starts with WHBAR (an empty path sends plain HBAR). Send exactly the sum of every `amountIn` as the transaction value. `batchId` is a `bytes32` tag, for example `"2026-10 payroll"`, that is indexed on every event.

A payment that fails does not sink the batch. Its HBAR is refunded to the sender when the batch ends, and `PayoutFailed` says which one it was. Events: `PayoutSent`, `PayoutFailed`, `BatchCompleted`.

On `/payouts`, paste one payment per line:

```
# address, HBAR to spend, token (optional)
0x846Ff469eC6e8592ae71D9D52999b89534639B3A, 0.5, SAUCE
0x1d17866a4B81d16A6B1a83338c9A11Bf56141d09, 0.3, HBAR
```

The page checks every row before you send: a route with liquidity, a quote, that the recipient has a Hedera account, and that it can receive the token. Rows that are not ready are left out.

Two things to know:
- **Every recipient needs a Hedera account.** Paying an address that has no account aborts the whole transaction (`INVALID_ALIAS_KEY`), not just that payment. The page flags these as "No account".
- **Cost.** Two swaps used about 1.1M gas on testnet, so budget about 0.5M gas per payment (about 0.4 HBAR each) on top of the HBAR paid out.

A real run is on [Hashscan](https://hashscan.io/testnet/transaction/0x6b8e5a07fd5fe34705a76ad9cb086c8e4c331c503f921595d3d2c87dc502ff5c).

## Auto-buy

Buy a token on a schedule. The Hedera Schedule Service (system contract `0x16b`) runs every purchase, so there is no bot.

1. On `/dca` you pick a token, the HBAR per run, how often and how many runs, and send the swap budget plus an automation fee for each run.
2. `ScheduledSwap.create` schedules the first run in the same transaction.
3. Each run swaps through `SwapHelper`, sends the tokens to you and schedules the next run before it ends.

If a swap fails (the price moved below your minimum) the run is skipped, its HBAR stays in the plan and the plan carries on. If the Schedule Service refuses to schedule the next run, the plan pauses and you can `resume` it. `cancel` refunds the unspent budget. Only the contract itself can trigger a run, and the owner can never withdraw escrowed budget.

| Cost (testnet) | Amount |
| --- | --- |
| Creating a plan | About 1.5M gas, about 1.3 HBAR |
| Automation fee | 1.3 HBAR per run, set by the owner (`setSettings`) |
| Gas limit of a run that reschedules | 2M (rescheduling used about 1.4M) |
| Gas limit of the final run | 0.8M |

The contract must hold the gas limit times the gas price when a run executes, even if the run uses less. That is why the fee is collected up front. Its 17 tests are in `packages/hardhat/test/ScheduledSwap.test.ts` and run against a mock Schedule Service placed at `0x16B`.

## Buy a token

The swap widget with the output fixed, for a project's own token page: `/buy?token=0.0.1183558` or set `NEXT_PUBLIC_BUY_TOKEN`. Embed it with:

```tsx
<SwapWidget title="Buy" defaultTokenOut="0.0.YOUR_TOKEN" lockTokenOut buttonLabel="Buy" />
```

The token needs a SaucerSwap V2 pool with liquidity.
