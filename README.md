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

## What you get

### Swapping

| Feature | Details |
| --- | --- |
| **Three swap types** | HBAR to token, token to token and token to HBAR, through SaucerSwap V2. |
| **Live quotes** | QuoterV2 quotes refreshed every 15 seconds, with the minimum received after slippage. |
| **Slippage and deadline** | Presets (0.1%, 0.5%, 1%), a custom value up to 50%, and a transaction deadline. |
| **Price impact and route** | Shows the route (direct pool, or two hops through WHBAR) and warns when the impact is high. |
| **One-click association** | Detects when your account (to receive) or `SwapHelper` (to pay) is not associated with a token, and associates in one click. |
| **Transaction status** | Approving, swapping and confirming states, with a Hashscan link for every transaction. |
| **Integrator fee** | Optional fee in the contract (0 by default, at most 1%) that accrues for the owner. |
| **Swap for someone else** | Every swap takes a `recipient`, so an app can swap on behalf of a user. |

### Data and pages

| Feature | Details |
| --- | --- |
| **Token list** | Every SaucerSwap token with a V2 pool, with icon, price and your balance, searchable. |
| **Pools browser** | V2 pools with fee tier, reserves and TVL, ordered by TVL. |
| **Swap history** | Your swaps through `SwapHelper`, read from the mirror node. |
| **Testnet and mainnet** | One config, chosen by the wallet's chain. |
| **Payment links** | Share a `/pay` link; the buyer pays in any token. |
| **In-app docs** | A `/docs` section with a sidebar: quickstart, how swaps work, components, hooks, customize, architecture, troubleshooting. |

### Use cases

| Use case | Route | Status | How it works |
| --- | --- | --- | --- |
| **Swap** | `/swap` | Done | HBAR to token, token to token, token to HBAR. |
| **Pay in any token** | `/pay` | Done | The buyer pays with any token and the receiver gets the token they chose. Build a link on `/pay`, share it, and the buyer lands on a checkout for it. The receiver address is passed as the swap `recipient`. |
| **Buy a token** | `/buy` | Done | A swap widget with a fixed output token, for a project's own token page. `/buy?token=0.0.1183558` or set `NEXT_PUBLIC_BUY_TOKEN`. |
| **Payouts** | `/payouts` | Planned | One funding token paid out to many recipients, each in their preferred token. |
| **Auto-buy (DCA)** | `/dca` | Planned | A contract schedules its own next swap through the Hedera Schedule Service. No bot. |

**Pay links.** `/pay?to=0x...&token=0.0.1183558&label=Cafe&order=1042` opens a checkout. `to` is the receiver, `token` is the token they receive (a Hedera id or `HBAR`), `label` and `order` are shown to the buyer. The receiver must be associated with the token, and the checkout tells the buyer if they are not. A swap sets the amount the buyer pays, not the amount the receiver gets, so for now the receiver gets the quoted amount at the time of payment.

**Scheduled swaps (spike result).** The Hedera Schedule Service works from a contract on testnet: a contract scheduled a call to itself, the network ran it on time and paid for it, and the run scheduled the next one. Each scheduled run needs the contract to hold the gas limit times the gas price (about 1.7 HBAR for 2M gas) when it executes, and a run that reschedules uses about 1.4M gas. The spike is in `packages/hardhat/contracts/spike/`.

### Routes and navbar

A standard Scaffold-HBAR app has three navbar items: **Home**, **Debug Contracts** and **Block Explorer**. This template changes them:

| Navbar item | Route | In plain Scaffold-HBAR | In this template |
| --- | --- | --- | --- |
| Use cases (dropdown) | `/swap`, `/pay`, `/buy` | no | **New.** Swap, Pay in any token, Buy a token. Grouped so the navbar stays short. |
| Pools | `/pools` | no | **New.** SaucerSwap V2 pools. |
| History | `/history` | no | **New.** Your recent swaps. |
| Docs | `/docs` | no | **New.** In-app documentation. |
| Debug Contracts | `/debug` | yes | Kept. Calls `SwapHelper` (read `feeBps`, `owner`; as owner `setFee`, withdraw fees). Light-mode text colour fixed. |
| Block Explorer | `/blockexplorer` | yes | Kept, but it only works against a local Hardhat node. On testnet it points to Hashscan. |
| Home | `/` | yes | Now a landing page for the template. The logo and name link to it, so there is no separate "Home" item. |

Also: `/api/health` returns `{"status":"ok"}`, and the navbar brand is `hedera-swap-kit` instead of "Scaffold-HBAR".

### Deployed on Hedera testnet

| What | Id | EVM address |
| --- | --- | --- |
| **SwapHelper** (this template, deployed) | [`0.0.10836039`](https://hashscan.io/testnet/contract/0.0.10836039) | `0x206bf34BA9c73dfC14c7847ad202a271c8105b30` |
| SaucerSwap V2 SwapRouter | [`0.0.1414040`](https://hashscan.io/testnet/contract/0.0.1414040) | `0x0000000000000000000000000000000000159398` |
| SaucerSwap QuoterV2 | [`0.0.1390002`](https://hashscan.io/testnet/contract/0.0.1390002) | `0x00000000000000000000000000000000001535b2` |
| WHBAR token (end of every HBAR path) | [`0.0.15058`](https://hashscan.io/testnet/token/0.0.15058) | `0x0000000000000000000000000000000000003aD2` |
| SAUCE token (used in the proof swap) | [`0.0.1183558`](https://hashscan.io/testnet/token/0.0.1183558) | `0x0000000000000000000000000000000000120f46` |
| WHBAR/SAUCE pool, 0.30% fee | [`0.0.2661057`](https://hashscan.io/testnet/contract/0.0.2661057) | n/a |

Mainnet ids are in `utils/saucerswap.ts` and `utils/swap/config.ts`: router `0.0.3949434`, quoter `0.0.3949424`, WHBAR token `0.0.1456986`. `SwapHelper` is not deployed on mainnet.

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
