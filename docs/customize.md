# Customize

Common changes, with the files to touch.

- [Change the fee](#change-the-fee)
- [Add a token](#add-a-token)
- [Add a pool](#add-a-pool)
- [Swap the DEX out](#swap-the-dex-out)
- [Go to mainnet](#go-to-mainnet)
- [Swap on behalf of a user](#swap-on-behalf-of-a-user)

## Change the fee

`SwapHelper` charges an integrator fee on the input amount. It is `0` by default and capped at `MAX_FEE_BPS` (100, which is 1%). Only the owner can change it. The deployer is the owner.

Set it from the **Debug Contracts** page (`/debug`), or from a script:

```ts
const helper = await ethers.getContractAt("SwapHelper", address);
await helper.setFee(30); // 0.30%
```

The frontend reads `feeBps` from the contract, so quotes and the "Fee" row in `QuoteDetails` update by themselves.

The fee **accrues inside the contract**. Collect it with:

```ts
await helper.withdrawTokenFees(tokenAddress, treasury, amount); // treasury must be associated with the token
await helper.withdrawHbarFees(treasury, amount);
```

Every `Swapped` event reports the `fee` taken. To raise the 1% cap, change `MAX_FEE_BPS` in `SwapHelper.sol` and redeploy.

## Add a token

You usually do not need to. The token list comes from SaucerSwap's `/tokens` endpoint, so any token with a V2 pool appears, with its icon and price. See `buildTokenList` in `utils/swap/tokens.ts`; it puts HBAR first, then vetted tokens, then the rest by symbol.

To **pin or restrict** the list, filter or extend the result in `buildTokenList`:

```ts
const ALLOWED = new Set(["0.0.1183558" /* SAUCE */, "0.0.456858" /* USDC */]);
return list.filter(t => t.isNative || ALLOWED.has(t.id));
```

A token with no pool cannot be swapped. If a pair has no direct pool, the route finder tries two hops through WHBAR (`findRoute` in `utils/swap/route.ts`).

## Add a pool

The kit swaps through pools that already exist; it does not create them. To add liquidity or create a pool, use the SaucerSwap app or its `NonfungiblePositionManager` contract ([developer docs](https://docs.saucerswap.finance/developers/contracts)). Once the pool has liquidity it appears in `/pools` and the route finder picks it up after the 5 minute cache expires (reload to force it).

On testnet, liquidity is thin. If a pair has no route, seed your own pool with testnet HBAR and a test token, then use that pair for demos.

A liquidity add/remove UI is not part of this template.

## Swap the DEX out

`SwapHelper` talks to the router through one interface, `ISaucerSwapRouter` (`contracts/interfaces/`). It uses three functions:

| Function | Used for |
| --- | --- |
| `exactInput(ExactInputParams)` | Every swap. HBAR in sends `value` with it. |
| `unwrapWHBAR(minAmount, recipient)` | Unwrapping WHBAR to HBAR on token-to-HBAR swaps. |
| `multicall(bytes[])` | Running `exactInput` then `unwrapWHBAR` in one transaction. |

To target another Uniswap V3 style DEX on Hedera, such as a fork with the same router ABI:

1. **Addresses.** Add the router, quoter and WHBAR token to `packages/hardhat/utils/saucerswap.ts` and `packages/nextjs/utils/swap/config.ts`. Use `idToEvmAddress("0.0.N")`.
2. **Router ABI.** If its `exactInput` or `unwrapWHBAR` signatures differ, update `ISaucerSwapRouter.sol`, `SwapHelper.sol` and `packages/nextjs/utils/swap/abis.ts`. Update `MockSwapRouter.sol` and the tests to match.
3. **Quotes.** `useQuote` calls `quoteExactInput` on the quoter (`quoterV2Abi` in `abis.ts`). Change the ABI if your DEX's quoter differs.
4. **Pool and token data.** `useTokenList`, `usePools` and `useSwapNetwork` read SaucerSwap's REST API (`saucerApi` in `config.ts`). Point them at your DEX's API, or build the same shapes (`SaucerSwapApiToken`, `ApiPool`) from the subgraph or the mirror node.
5. **Routing.** `findRoute` expects pools shaped `{ tokenA, tokenB, fee, liquidity }`. Keep that shape and the rest follows.
6. Redeploy `SwapHelper` and run `hardhat:test` and `next:test`.

If the new DEX is not a concentrated-liquidity (V3 style) design, the path encoding and `exactInput` will not apply, and `SwapHelper` and `useSwap` need a bigger rewrite. The components do not care: they only use the hooks' return values.

## Go to mainnet

Mainnet router, quoter and WHBAR ids are already in both config files (`0.0.3949434`, `0.0.3949424`, `0.0.1456986`). The template has been exercised on testnet only, so check each id against [HashScan](https://hashscan.io/mainnet) and run a small swap before putting real funds through it.

1. Fund a mainnet deployer account with HBAR.
2. Optionally set `NEXT_PUBLIC_HEDERA_MAINNET_RPC_URL` in `packages/nextjs/.env` (defaults to Hashio).
3. Deploy:
   ```bash
   npm run hardhat:deploy -- --network hederaMainnet
   ```
4. Set a fee if you want one (`setFee`), and consider moving ownership to a multisig.
5. Run the app and switch the wallet to Hedera Mainnet (295). The kit picks the mainnet endpoints from the wallet's chain.
6. Verify the contract: `npm run hardhat:verify -- SwapHelper mainnet`.

Mainnet liquidity is deep, so quotes and price impact are meaningful there. Keep the high-impact warning on.

## Swap on behalf of a user

Every swap function takes a `recipient`. A backend or app can swap with a user's funds and send the output straight to another account. The recipient must be associated with the output token.

```ts
await swap({ tokenIn, tokenOut, route, amountIn, amountOutMinimum, recipient: "0xUser…" });
```
