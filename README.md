# hedera-swap-kit

A [Scaffold-HBAR](https://docs.hedera.com/solutions/tools/scaffold-hbar/index) template for apps that need **token swaps on Hedera**: wallets, payment apps, game stores and DeFi front ends.

It is a swap toolkit, not a single demo page:

- **`SwapHelper.sol`** wraps the [SaucerSwap V2](https://docs.saucerswap.finance) router and handles the Hedera-specific problems EVM developers hit: HTS token association, native HBAR vs WHBAR, and tinybar vs weibar.
- **A React component kit and hooks** (`SwapWidget`, `TokenSelect`, `useQuote`, `useSwap` and more) you can drop into your own app.
- **A demo app** built from those parts: `/swap`, `/pools`, `/history`.
- An optional **integrator fee** in the contract, so you can monetize an app built on it.

| Desktop | Mobile |
| --- | --- |
| ![Swap page on desktop](docs/images/swap-desktop.png) | <img src="docs/images/swap-mobile.png" alt="Swap page on mobile" width="260"> |

## Why

Swapping on Hedera is not the same as swapping on Ethereum. A plain Uniswap-style integration fails in three places:

1. An account or contract cannot hold an HTS token until it is **associated** with it.
2. Native HBAR is not an ERC-20. SaucerSwap trades **WHBAR**, and the router has to wrap and unwrap it for you.
3. HBAR has **8 decimals** (tinybar) inside contracts but **18** (weibar) in JSON-RPC `msg.value`.

This template does all three for you and explains them below.

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 20.18.3 or newer
- [Git](https://git-scm.com/)
- A Hedera testnet account with some HBAR from the [faucet](https://portal.hedera.com/faucet)
- Optional: a [WalletConnect project id](https://cloud.walletconnect.com) for the wallet modal

### Create a project from this template

```bash
npm create scaffold-hbar@latest my-swap-app -- --template ayushsingh82/hedera-swap-kit
cd my-swap-app
npm install --legacy-peer-deps
```

The CLI asks for frontend, Solidity framework, network and package manager. This template supports Next.js and Hardhat. To skip the prompts (CI, scripts), add `--frontend nextjs-app --solidity-framework hardhat --network testnet --package-manager npm --ci`.

Or clone this repository and run `npm install --legacy-peer-deps`.

### Run it on testnet

```bash
npm install --legacy-peer-deps

# 1. Set up a deployer account (encrypted key, stored in packages/hardhat/.env)
npm run hardhat:account:generate      # or hardhat:account:import
# Fund the printed address from https://portal.hedera.com/faucet

# 2. Deploy SwapHelper to Hedera testnet
npm run hardhat:deploy -- --network hederaTestnet

# 3. Start the app
npm run next:dev                      # http://localhost:3000
```

Open `/swap`, connect a wallet on Hedera Testnet, pick a token, and swap. If a token needs association, the widget shows a one-click **Associate** button first.

### Run a swap from the command line

```bash
npm run hardhat:swap-testnet
```

It swaps 1 HBAR for SAUCE through the deployed `SwapHelper` and prints a Hashscan link. It needs `__RUNTIME_DEPLOYER_PRIVATE_KEY` in `packages/hardhat/.env`.

### Proof of a real testnet swap

A real swap of 1 HBAR for SAUCE through the deployed `SwapHelper` on Hedera testnet:

- Transaction: [`0x1bd1c348…b4f2`](https://hashscan.io/testnet/transaction/0x1bd1c3480d29849e60e9f8abc79733b5fc713d1649a9edb118752ba08fd7b4f2)
- `SwapHelper`: `0x206bf34BA9c73dfC14c7847ad202a271c8105b30`

## Environment variables

| Variable | File | Purpose |
| --- | --- | --- |
| `HEDERA_RPC_URL` | `packages/hardhat/.env` | JSON-RPC endpoint for deploys. Defaults to Hashio testnet. |
| `DEPLOYER_PRIVATE_KEY_ENCRYPTED` | `packages/hardhat/.env` | Written by `hardhat:account:generate` or `:import`. Do not fill by hand. |
| `__RUNTIME_DEPLOYER_PRIVATE_KEY` | `packages/hardhat/.env` | Optional ECDSA key (`0x…`) for non-interactive scripts such as `hardhat:swap-testnet`. Use a throwaway testnet key. |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | `packages/nextjs/.env` | WalletConnect project id. |
| `NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL` | `packages/nextjs/.env` | Overrides the testnet RPC the app reads from. |
| `NEXT_PUBLIC_HEDERA_MAINNET_RPC_URL` | `packages/nextjs/.env` | Overrides the mainnet RPC. |

`.env` files are git-ignored. Never commit a private key.

## How swaps work on Hedera

### The path

SaucerSwap V2 describes a route as a packed byte string: `token (20 bytes) · pool fee (3 bytes) · token · …`. `SwapHelper.encodePath` builds it, and so does `encodePath` in `utils/swap/route.ts`. Pool fees are in hundredths of a basis point: `500` is 0.05%, `3000` is 0.30%, `10000` is 1%.

### WHBAR

Pools hold **WHBAR**, an HTS token that stands in for HBAR. You never wrap by hand:

- **HBAR in:** the swap sends HBAR as `msg.value` and the router wraps it. The path must start with the WHBAR token.
- **HBAR out:** the router swaps to WHBAR, then `unwrapWHBAR` turns it into HBAR for `SwapHelper`, which forwards it. The path must end with the WHBAR token.

The WHBAR address used in paths is the **token** (`0.0.15058` on testnet), not the WHBAR contract.

### Association

On Hedera an account must be associated with an HTS token before it can receive or hold it.

| You are… | Who must be associated | How |
| --- | --- | --- |
| Swapping **to** a token | The **recipient** (usually the connected wallet) | `associate()` on the token (HRC-719). The widget's **Associate** button does it. |
| Swapping **from** a token | **`SwapHelper`**, because it pulls the token before swapping | `SwapHelper.associate(token)`. Anyone can call it once per token. |
| Using native HBAR | Nobody | Not needed. |

### Tinybar vs weibar

HBAR has 8 decimals (tinybar) as an HTS and contract amount, but JSON-RPC `msg.value` uses 18 decimals (weibar) so EVM tooling works. One tinybar is `10^10` weibar. The kit handles it in two places:

- `useSwap` sends `msg.value = amountIn * WEIBAR_PER_TINYBAR`.
- The quoter and every `amountIn` / `amountOut` in the kit are in **tinybar**.

If you write your own integration, convert at the boundary and nowhere else.

### The integrator fee

`SwapHelper.feeBps` (0 by default, at most 100 = 1%) is taken from the input amount and kept in the contract. The owner collects it with `withdrawTokenFees` or `withdrawHbarFees`. It accrues instead of being paid out per swap because a transfer to an unassociated recipient reverts on Hedera.

More detail and diagrams: [docs/architecture.md](docs/architecture.md).

## Project structure

```
packages/
  hardhat/
    contracts/SwapHelper.sol       the swap entry point (+ interfaces/, mocks/)
    deploy/00_deploy_swap_helper.ts
    scripts/testnetSwap.ts         one real testnet swap, prints a Hashscan link
    test/SwapHelper.test.ts        contract tests
    utils/saucerswap.ts            router, quoter and WHBAR addresses per network
  nextjs/
    app/                           pages: /, /swap, /pools, /history, /docs, /api/health
    components/swap/               the component kit
    hooks/swap/                    the hooks
    utils/swap/                    pure logic (math, route, tokens, config) + tests
docs/                              components, customize, architecture
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run hardhat:compile` | Compile contracts |
| `npm run hardhat:test` | Contract tests |
| `npm run hardhat:deploy -- --network hederaTestnet` | Deploy `SwapHelper` |
| `npm run hardhat:swap-testnet` | Run one real swap |
| `npm run next:dev` | Start the app |
| `npm run next:test` | Unit tests for the swap logic |
| `LIVE=1 npm run next:test` | Adds a live testnet quote test |
| `npm run next:build` | Production build |
| `npm run next:check-types` | Type check |
| `npm run hardhat:lint`, `npm run next:lint` | Lint |

## Docs

- [Components and hooks](docs/components.md): props, examples, usage
- [Customize](docs/customize.md): swap the DEX, add a token, change the fee, mainnet
- [Architecture](docs/architecture.md): contract and frontend flows
- [AGENTS.md](AGENTS.md): briefing for AI coding agents

## Troubleshooting

**"SwapHelper is not deployed on Hedera Testnet."** Run `npm run hardhat:deploy -- --network hederaTestnet`. The deploy writes the address to `packages/nextjs/contracts/deployedContracts.ts`.

**The swap reverts with no reason.** Check, in order: the recipient is associated with the output token; for token inputs, `SwapHelper` is associated with the input token and you approved it; the deadline has not passed; slippage is not too tight for a thin pool.

**"No route".** No pool with liquidity connects the pair. Testnet liquidity is thin: try HBAR/SAUCE, or see [docs/customize.md](docs/customize.md#add-a-pool).

**Build fails resolving `@x402/*`.** Already handled in `next.config.ts`. If you upgrade RainbowKit and it returns, keep that webpack alias.

**Token to HBAR costs more.** HTS transfers are gas heavy: on testnet a token to HBAR swap used about 1.7M gas (about 1.4 HBAR at 84 tinybar per gas), against about 0.2M for HBAR to token. Hedera bills the gas used, not the limit.

**`INSUFFICIENT_PAYER_BALANCE` or out of gas.** The account needs HBAR for fees. When you swap your whole balance the widget keeps 1 HBAR back for this.

**Wrong network.** The widget reads the wallet's chain. Switch to Hedera Testnet (296) or Mainnet (295).

## Status

Tested: contract unit tests, swap-logic unit tests, type check and production build. Not yet exercised by the maintainers: the full wallet-driven flow on testnet and a mainnet deploy. See [PLAN.md](PLAN.md).

## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [SaucerSwap developer docs](https://docs.saucerswap.finance)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan](https://hashscan.io/)

## License

MIT, see [LICENCE](LICENCE).
