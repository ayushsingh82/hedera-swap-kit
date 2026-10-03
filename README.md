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
| **Auto-buy** | Recurring purchases run by the Hedera Schedule Service, with progress, cancel and resume. |
| **In-app docs** | A `/docs` section with a sidebar: quickstart, how swaps work, components, hooks, customize, architecture, troubleshooting. |

### Use cases

| Use case | Route | Status | How it works |
| --- | --- | --- | --- |
| **Swap** | `/swap` | Done | HBAR to token, token to token, token to HBAR. |
| **Pay in any token** | `/pay` | Done | The buyer pays with any token and the receiver gets the token they chose. Build a link on `/pay`, share it, and the buyer lands on a checkout for it. The receiver address is passed as the swap `recipient`. |
| **Buy a token** | `/buy` | Done | A swap widget with a fixed output token, for a project's own token page. `/buy?token=0.0.1183558` or set `NEXT_PUBLIC_BUY_TOKEN`. |
| **Payouts** | `/payouts` | Done | Paste a list, see what each recipient gets, and pay everyone in one transaction through `BatchPayout`. A payment that fails is refunded, not fatal. |
| **Auto-buy (DCA)** | `/dca` | Done | Buy a token on a schedule. `ScheduledSwap` schedules each run through the Hedera Schedule Service, and each run schedules the next. No bot. |

**Pay links.** `/pay?to=0x...&token=0.0.1183558&label=Cafe&order=1042` opens a checkout. `to` is the receiver, `token` is the token they receive (a Hedera id or `HBAR`), `label` and `order` are shown to the buyer. The receiver must be associated with the token, and the checkout tells the buyer if they are not. A swap sets the amount the buyer pays, not the amount the receiver gets, so for now the receiver gets the quoted amount at the time of payment.

### Auto-buy with the Hedera Schedule Service

`ScheduledSwap` buys a token on a schedule with no keeper bot. It is the one use case that needs a Hedera-only capability: the Hedera Schedule Service (HSS, system contract `0x16b`) lets a contract schedule a call to itself, and the network runs it at the time you chose.

1. **Create a plan** on `/dca`: token, HBAR per run, how often, how many runs. You send the swap budget plus an automation fee for each run. The contract schedules the first run in the same transaction.
2. **Each run** swaps `amountPerRun` HBAR through `SwapHelper`, sends the tokens to you, and schedules the next run before it ends.
3. **Progress** shows on `/dca`, with a Hashscan link to the next scheduled run.
4. **Cancel** any time for a refund of the unspent budget.

How it handles trouble:
- A swap that fails (the price moved below your minimum) is skipped. Its HBAR stays in your plan and the plan carries on.
- If HSS refuses to schedule the next run, the plan pauses and you can resume it.
- Only the contract itself can trigger a run, and the owner can never withdraw escrowed budget.

What it costs (measured on testnet, so check mainnet before relying on it):

| Cost | Amount | Why |
| --- | --- | --- |
| Creating a plan | about 1.5M gas, about 1.3 HBAR | Scheduling the first run is gas heavy |
| Automation fee | 1.3 HBAR per run (set by the owner) | The contract pays the network when each scheduled call executes |
| Gas limit of a run that reschedules | 2M | Rescheduling used about 1.4M gas |
| Gas limit of the final run | 0.8M | It only swaps, so it needs far less balance |

The contract must hold the gas limit times the gas price (84 tinybar per gas on testnet) when a run executes, even if the run uses less. That is why the fee is collected up front.

Tests run against a mock Schedule Service (`MockScheduleService`) placed at `0x16B`: `npm run hardhat:test`. The first experiment that proved the pattern is in `packages/hardhat/contracts/spike/`.

### Routes and navbar

A standard Scaffold-HBAR app has three navbar items: **Home**, **Debug Contracts** and **Block Explorer**. This template changes them:

| Navbar item | Route | In plain Scaffold-HBAR | In this template |
| --- | --- | --- | --- |
| Use cases (dropdown) | `/swap`, `/pay`, `/payouts`, `/dca`, `/buy` | no | **New.** Swap, Pay in any token, Payouts, Auto-buy, Buy a token. Grouped so the navbar stays short. |
| Pools | `/pools` | no | **New.** SaucerSwap V2 pools. |
| History | `/history` | no | **New.** Your recent swaps. |
| Docs | `/docs` | no | **New.** In-app documentation. |
| Debug Contracts | `/debug` | yes | Kept. Calls `SwapHelper` (read `feeBps`, `owner`; as owner `setFee`, withdraw fees). Light-mode text colour fixed. |
| Block Explorer | `/blockexplorer` | yes | Kept, but shown in the navbar only on the local network, where it works. On testnet use Hashscan. |
| Home | `/` | yes | Now a landing page for the template. The logo and name link to it, so there is no separate "Home" item. |

Also: `/api/health` returns `{"status":"ok"}`, and the navbar brand is `hedera-swap-kit` instead of "Scaffold-HBAR".

### Deployed on Hedera testnet

| What | Id | EVM address |
| --- | --- | --- |
| **SwapHelper** (swap, pay, buy) | [`0.0.10836039`](https://hashscan.io/testnet/contract/0.0.10836039) | `0x206bf34BA9c73dfC14c7847ad202a271c8105b30` |
| **ScheduledSwap** (auto-buy) | [`0.0.10838897`](https://hashscan.io/testnet/contract/0.0.10838897) | `0x7FC7A91a7E8d1183db212d1452D7F46639519cA8` |
| **BatchPayout** (payouts) | [`0.0.10838907`](https://hashscan.io/testnet/contract/0.0.10838907) | `0xDeb518Dd98706ed52c5c972dF3DE8D0ad55b47c1` |
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

npm run init             # creates a deployer wallet, saves its key to packages/hardhat/.env, prints the address
# Fund that address with testnet HBAR: https://portal.hedera.com/faucet (about 20 HBAR is plenty)

npm run doctor           # checks Node, the key, the balance, the mirror node, SaucerSwap and your deployments
npm run deploy:testnet   # deploys SwapHelper, ScheduledSwap and BatchPayout
npm run next:dev         # http://localhost:3000
```

`npm run init` is safe to run again: it never replaces an existing key. `npm run doctor` tells you what is missing and how to fix it.

Open `/swap`, connect a wallet on Hedera Testnet, pick a token, and swap. If a token needs association, the widget shows a one-click **Associate** button first.

Prefer an encrypted key? `npm run hardhat:account:generate` and `npm run hardhat:deploy -- --network hederaTestnet` still work and ask for a password.

### Run each use case from the command line

Every use case has a demo that sends one real testnet transaction and prints its Hashscan link. They use the funded account in `packages/hardhat/.env`.

| Command | What it does | Rough cost (estimate) |
| --- | --- | --- |
| `npm run demo:swap` | Swaps 1 HBAR for SAUCE | about 1.2 HBAR with fees |
| `npm run demo:pay` | Pays 0.5 HBAR as SAUCE to a receiver (`DEMO_RECEIVER=0x...`, default yourself) | about 0.7 HBAR |
| `npm run demo:payout` | Pays two recipients in one batch | about 1.1 HBAR |
| `npm run demo:dca` | Creates a 2-run auto-buy and watches the network run it | about 6 HBAR |

### Proof on Hedera testnet

| Use case | Transaction |
| --- | --- |
| Swap, 1 HBAR to SAUCE | [`0x1bd1c348…b4f2`](https://hashscan.io/testnet/transaction/0x1bd1c3480d29849e60e9f8abc79733b5fc713d1649a9edb118752ba08fd7b4f2) |
| Payout, two payments in one batch | [`0x6b8e5a07…ff5c`](https://hashscan.io/testnet/transaction/0x6b8e5a07fd5fe34705a76ad9cb086c8e4c331c503f921595d3d2c87dc502ff5c) |
| Pay in any token | uses the swap path with a `recipient`; run `npm run demo:pay` |
| Auto-buy | `ScheduledSwap` is deployed on testnet (`0.0.10838897`). Run `npm run demo:dca` to create a plan and watch the network run it (needs about 6 HBAR) |

The deployed contracts are in the table above.

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

On Hedera an account must be associated with an HTS token before it can hold it. Accounts created recently allow **automatic associations** (`max_automatic_token_associations` of -1 means unlimited), so the token is associated when it first arrives and no step is needed. This holds for contracts and EVM-created accounts too: in the payout above, a contract that had never held SAUCE received it and was associated automatically. Older accounts, or accounts that turned it off, must associate first.

| You are… | Who must be associated | How |
| --- | --- | --- |
| Swapping **to** a token | The **recipient**, unless it allows automatic associations | `associate()` on the token (HRC-719). The widget's **Associate** button does it, and only appears when needed. |
| Swapping **from** a token | **`SwapHelper`**, because it pulls the token before swapping | `SwapHelper.associate(token)`. Anyone can call it once per token. |
| Using native HBAR | Nobody | Not needed. |

Every recipient also needs a Hedera **account**. Paying an address that has none aborts the whole transaction (`INVALID_ALIAS_KEY`). The payouts page checks this for you.

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
    contracts/ScheduledSwap.sol    auto-buy plans run by the Hedera Schedule Service
    contracts/spike/               the first Schedule Service experiment
    deploy/00_deploy_swap_helper.ts
    deploy/01_deploy_scheduled_swap.ts
    scripts/testnetSwap.ts         one real testnet swap, prints a Hashscan link
    test/SwapHelper.test.ts        contract tests
    test/ScheduledSwap.test.ts     auto-buy tests (mock Schedule Service)
    utils/saucerswap.ts            router, quoter and WHBAR addresses per network
  nextjs/
    app/                           pages: /, /swap, /pay, /payouts, /buy, /dca, /pools, /history, /docs, /api/health
    components/swap/               the component kit
    components/use-cases/          payment link builder, auto-buy form and plans
    hooks/swap/                    the hooks
    utils/swap/                    pure logic (math, route, tokens, config) + tests
docs/                              components, customize, architecture
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run init` | Create a deployer wallet and save its key to `.env` |
| `npm run doctor` | Check the setup and say how to fix anything missing |
| `npm run deploy:testnet` | Deploy every contract to testnet |
| `npm run demo:swap`, `demo:pay`, `demo:payout`, `demo:dca` | Run one real testnet transaction per use case |
| `npm run next:dev` | Start the app |
| `npm run hardhat:compile`, `npm run hardhat:test` | Compile and test the contracts |
| `npm run next:test` | Unit tests for the swap, payout and auto-buy logic |
| `LIVE=1 npm run next:test` | Adds a live testnet quote test |
| `npm run next:build`, `npm run next:check-types` | Production build, type check |
| `npm run hardhat:lint`, `npm run next:lint` | Lint |

## Docs

- [Use cases](docs/use-cases.md): swap, pay, payouts, auto-buy and buy, with costs and limits
- [Components and hooks](docs/components.md): props, examples, usage
- [Customize](docs/customize.md): swap the DEX, add a token, change the fee, mainnet
- [Architecture](docs/architecture.md): contract and frontend flows
- [AGENTS.md](AGENTS.md): briefing for AI coding agents

## Troubleshooting

**"SwapHelper is not deployed on Hedera Testnet."** Run `npm run hardhat:deploy -- --network hederaTestnet`. The deploy writes the address to `packages/nextjs/contracts/deployedContracts.ts`.

**The swap reverts with no reason.** Check, in order: the recipient has an account and can receive the output token (see Association); for token inputs, `SwapHelper` is associated with the input token and you approved it; the deadline has not passed; slippage is not too tight for a thin pool.

**"No route".** No pool with liquidity connects the pair. Testnet liquidity is thin: try HBAR/SAUCE, or see [docs/customize.md](docs/customize.md#add-a-pool).

**Build fails resolving `@x402/*`.** Already handled in `next.config.ts`. If you upgrade RainbowKit and it returns, keep that webpack alias.

**Token to HBAR costs more.** HTS transfers are gas heavy: on testnet a token to HBAR swap used about 1.7M gas (about 1.4 HBAR at 84 tinybar per gas), against about 0.2M for HBAR to token. Hedera bills the gas used, not the limit.

**A payout batch reverts with `INVALID_ALIAS_KEY`.** One recipient has no Hedera account yet. Send it some HBAR first. The payouts page marks these rows "No account" and leaves them out.

**"Insufficient funds for transfer" from a script.** The account must hold the gas limit times the max fee up front, and ethers defaults the max fee to twice the gas price. Pass `maxFeePerGas` equal to the gas price (the demo scripts do) and keep a little HBAR spare. Wallets such as MetaMask choose their own fee.

**An auto-buy run did not happen.** The contract must hold the gas limit times the gas price when a run executes. A plan whose next run could not be scheduled shows as paused: press Resume.

**`INSUFFICIENT_PAYER_BALANCE` or out of gas.** The account needs HBAR for fees. When you swap your whole balance the widget keeps 1 HBAR back for this.

**Wrong network.** The widget reads the wallet's chain. Switch to Hedera Testnet (296) or Mainnet (295).

## Status

Tested: 52 contract tests (`SwapHelper` 26, `ScheduledSwap` 17, `BatchPayout` 9), 32 unit tests, type check, lint and production build. Run on testnet: deploys of all three contracts, a swap, and a batch payout. A full multi-run auto-buy has no recorded Hashscan link yet (run `npm run demo:dca` to make one), and the wallet-driven UI and mainnet have not been exercised. See [PLAN.md](PLAN.md).

## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [SaucerSwap developer docs](https://docs.saucerswap.finance)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan](https://hashscan.io/)

## License

MIT, see [LICENCE](LICENCE).
