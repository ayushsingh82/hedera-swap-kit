# Plan: hedera-swap-kit (SaucerSwap swap template for scaffold-hbar)

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
- [x] `origin` set to `ayushsingh82/hedera-swap-kit`

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

### Phase 2: frontend (`packages/nextjs`) (built, uncommitted)
Component kit in `components/swap/`, hooks in `hooks/swap/`, pure logic in `utils/swap/`.

Components:
- [x] `SwapWidget`, `TokenSelect`, `AmountInput`, `SlippageSettings`, `QuoteDetails`, `AssociateButton`, `TxStatus`, `SwapHistory`, `PoolsTable`

Hooks:
- [x] `useQuote`, `useSwap`, `useTokenList`, `useTokenBalances`, `useAssociation`, `useSwapHistory`, plus `useRoute`, `usePools`, `useSwapHelper`, `useSwapNetwork`

Pages and routes:
- [x] `/` landing, `/swap`, `/pools`, `/history`, `/api/health`, header links

Quality:
- [x] Loading, empty and error states
- [x] Unit tests for the pure logic (18, vitest) and a live testnet quote test (`LIVE=1 npm run next:test`)
- [x] Fixed a fresh-scaffold build failure: webpack tried to resolve the optional `@x402/*` packages pulled in by RainbowKit connectors
- [x] CI runs the unit tests and the production build
- [ ] Not verified yet: a real wallet driving the UI, `associate()` and a swap on testnet (needs the funded key and a deployed SwapHelper)
- [ ] Mobile layout check in a real browser

### Phase 3: docs (30 points, treated as a product)
- [x] `README.md` (written; screenshot and Hashscan link are TODO placeholders): what and why, screenshot, prerequisites, quickstart, env vars, architecture diagram, "how swaps work on Hedera" (association, WHBAR, tinybar vs weibar), project structure, troubleshooting, Hashscan proof link
- [x] `docs/components.md`: every component and hook with props and examples (screenshots TODO)
- [x] `docs/customize.md`: swap the DEX out, add a token, change the fee, add a pool, go to mainnet
- [x] `docs/architecture.md`: contract and frontend flow diagrams
- [x] `AGENTS.md`: repo map, commands, conventions, do and don't for AI agents (replace the stale scaffold text)
- [ ] Comments only where the code is non-obvious

### Phase 4: gate verification (run Oct 3 on a clean scaffold; uncommitted changes)
- [x] Template command run from a clean directory with `--ci`. **Found and fixed a gate-breaking bug:** `template.json` had no top-level `name`, which the CLI requires, so scaffolding failed. Added `name`, `description`, `version`, `requirements` and an `outro`
- [ ] Re-run the command against GitHub once `template.json` is on `main` and the repo is public. The repo is **private**, so the public command returns 404 (it only worked locally with `CREATE_SCAFFOLD_HBAR_TEMPLATE_DIR` and with a `gh` token via `GIGET_AUTH`)
- [x] `npm install --legacy-peer-deps`, `next:lint`, `next:check-types`, 18 unit tests and `next:build` pass in the clean app. `hardhat:lint` has 0 errors and 3 warnings (CI does not fail on warnings)
- [x] App boots; `/`, `/swap`, `/pools`, `/history`, `/docs`, `/debug` and `/api/health` return 200
- [x] `template.json` valid, README and AGENTS present, MIT licence with the original and our copyright lines
- [x] No committed `.env` or keystore. The only key-like string is the public Hardhat default account in `hardhat.config.ts`
- [ ] Hashscan link in the README: needs `npm run hardhat:swap-testnet` with a funded key
- [ ] Hardhat contract tests were not re-run in the clean app
- [ ] `PLAN.md`, `.agents/` and `.claude/` ship inside generated projects. Decide whether to keep them

### Phase 5: submit
- [ ] Make the repo public (it is private now), registration confirmed
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
