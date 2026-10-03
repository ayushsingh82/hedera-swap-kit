# Plan: swap-kit (SaucerSwap swap template for scaffold-hbar)

Built for the Hedera Scaffold-HBAR Template Bounty. Deadline: **Sun Oct 4, 11:59 PM ET**.
Rubric: ecosystem integration 35, docs 30, code quality 20, Hedera service depth 15.

## What it is
A forkable scaffold-hbar template for apps that need token swaps on Hedera (wallets, payment apps, game stores, DeFi front ends). It is a **swap toolkit, not a single demo page**: a contract that wraps SaucerSwap V2 and handles the Hedera-specific problems EVM developers hit (HTS association, WHBAR), plus a set of reusable React components and hooks a developer can drop into their own app, and a full demo app built from them.

## Feature tiers
Cut from the bottom if time runs out. Docs are never cut.

**Must (gate and core score)**
- Swap HBAR to token, token to token, token to HBAR
- Association check and one-click associate
- Live quote, slippage and deadline settings
- Hashscan links for every transaction
- Docs, `AGENTS.md`, tests

**Should (makes it more than basic)**
- Reusable component kit and hooks, documented one by one
- Token list with search, logos and balances
- Price impact and route display, with a warning on high impact
- Swap history from the mirror node
- Pools browser from the SaucerSwap API (TVL, fee tier, reserves)
- Optional integrator fee in the contract, for developers who want to monetize their app
- Testnet and mainnet switch from one config

**Nice (only if time remains)**
- Add and remove liquidity UI
- Portfolio view of HTS balances
- Multi-hop route finder across pools

## Layout
Kept from `create-scaffold-hbar` so the CLI scripts keep working:
- `packages/hardhat`: contracts, deploy scripts, tests
- `packages/nextjs`: frontend (App Router, RainbowKit, wagmi, viem)

## Testnet IDs (verified live on the testnet mirror node)
| Contract | ID |
|---|---|
| V2 SwapRouter | 0.0.1414040 |
| QuoterV2 | 0.0.1390002 |
| V2 Factory | 0.0.1197038 |
| WHBAR contract | 0.0.15057 |
| WHBAR token | 0.0.15058 |
| WhbarHelper | 0.0.5286055 |

## Phases

### Phase 0: init (done)
- [x] `npm create scaffold-hbar@latest` with the `blank` template (Next.js, Hardhat, testnet, npm)
- [x] `template.json` manifest, MIT licence with our copyright line, `.env` ignored
- [x] Removed the unused Foundry submodules file
- [x] `origin` set to `ayushsingh82/hbar-template`

### Phase 1: contracts (`packages/hardhat`) (done except the live testnet swap)
- [x] Replace the blank template's sample contracts with `SwapHelper.sol`: wraps the V2 SwapRouter `exactInput`, HBAR in via msg.value, HBAR out via the router's `unwrapWHBAR`, emits events
- [x] Per-network address config in one file (`utils/saucerswap.ts`)
- [x] Hardhat deploy script and unit tests (14 passing)
- [x] A script that runs one real testnet swap and prints the Hashscan link (`npm run hardhat:swap-testnet`), written but **not yet run**: needs a funded testnet key
- [x] A testnet pool with real reserves: V2 pool 0.0.2661057 (WHBAR/SAUCE, 0.30%)

### Phase 1b: contract extras (done, uncommitted)
- [x] Optional integrator fee: `feeBps` set by the owner, capped at 1% (`MAX_FEE_BPS`), taken from the input amount, reported in `Swapped`. The fee stays in the contract and the owner withdraws it with `withdrawTokenFees` / `withdrawHbarFees`. Accruing instead of paying out avoids transfers to an unassociated recipient, which revert on Hedera.
- [x] Every swap function takes a `recipient`, so apps can swap on behalf of users (a parameter instead of separate variants)
- [x] `SwapHelper` is `Ownable`; the deploy script passes the deployer as owner
- [x] 26 unit tests (was 14): fee default, owner only, cap, fee on each swap type, withdrawals, recipient, zero address

### Phase 2: frontend (`packages/nextjs`)
Component kit in `components/swap/`, hooks in `hooks/swap/`, each documented in the README.

Components:
- [ ] `SwapWidget`: the drop-in widget that composes everything below
- [ ] `TokenSelect`: searchable token list with logo, symbol and balance
- [ ] `AmountInput`: amount with MAX button and USD value
- [ ] `SlippageSettings`: presets and custom value, plus deadline
- [ ] `QuoteDetails`: rate, minimum received, price impact, route, fees
- [ ] `AssociateButton`: checks association and associates in one click
- [ ] `TxStatus`: pending, success and error states with a Hashscan link
- [ ] `SwapHistory`: recent swaps for the connected account from the mirror node
- [ ] `PoolsTable` (Should): SaucerSwap pools with TVL, fee tier and reserves

Hooks:
- [ ] `useQuote` (QuoterV2), `useSwap` (builds the path and calls `SwapHelper`), `useTokenList`, `useTokenBalances`, `useAssociation`, `useSwapHistory`

Pages and routes (for the gate):
- [ ] `/` landing page explaining the template, `/swap` the demo app, `/pools`, `/history`, `/api/health`

Quality:
- [ ] Loading, empty and error states on every component
- [ ] Mobile layout
- [ ] Component tests for the pure logic (slippage math, path building, formatting)

### Phase 3: docs (30 points, treated as a product)
- [ ] `README.md`: what and why, screenshot, prerequisites, quickstart, env vars, architecture diagram, "how swaps work on Hedera" (association, WHBAR, tinybar vs weibar), project structure, troubleshooting, Hashscan proof link
- [ ] `docs/components.md`: every component and hook with props, example and screenshot
- [ ] `docs/customize.md`: swap the DEX out, add a token, change the fee, add a pool, go to mainnet
- [ ] `docs/architecture.md`: contract and frontend flow diagrams
- [ ] `AGENTS.md`: repo map, commands, conventions, do and don't for AI agents (replace the stale scaffold text)
- [ ] Comments only where the code is non-obvious

### Phase 4: gate verification
- [ ] `npm create scaffold-hbar@latest -- --template ayushsingh82/hbar-template` from a clean directory
- [ ] install, lint, build pass clean
- [ ] app boots, core routes return 200
- [ ] `template.json` valid, README and AGENTS present, MIT licence
- [ ] no committed secrets or `.env`
- [ ] Hashscan link in the README

### Phase 5: submit
- [ ] Public repo, registration confirmed
- [ ] Submission form: repo link, Hashscan link, dev-ex survey

## Timeline
| When | Work |
|---|---|
| Oct 2 | Phase 0 and Phase 1 (pushed) |
| Oct 3 | Phase 1b, Phase 2 (Must and Should), start Phase 3 |
| Oct 4 | Finish docs, Phase 4, push, submit before the deadline |

## Risks
- **Thin testnet liquidity:** seed our own pool, or fall back to a read-only quote and document it.
- **Time:** cut scope from the bottom of the tiers before touching docs. Nice items go first, then Should items.
- **Overlap with `cross-chain-dca`:** pitch this as a swap building block, not a strategy.
