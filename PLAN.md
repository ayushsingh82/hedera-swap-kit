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
- [x] Live testnet checks of the contract paths through the deployed `SwapHelper` (`0x206bf34BA9c73dfC14c7847ad202a271c8105b30`): HBAR to token, `SwapHelper.associate`, wallet association, and token to HBAR all succeeded. The swap widget renders with the burner wallet
- [ ] Not verified: a person clicking through the UI with a real wallet (headless Chrome cannot sign)
- [x] Fixed from the live run: `SWAP_GAS` (1.5M) was below the 1.66M a token to HBAR swap consumes, and `ASSOCIATE_GAS` (0.8M) was tight at 0.73M. Raised to 2.5M and 1.0M
- [x] Mobile layout checked at 390px in headless Chrome (no horizontal overflow); screenshots in `docs/images/`

### Phase 3: docs (30 points, treated as a product)
- [x] `README.md` (written; screenshot and Hashscan link are TODO placeholders): what and why, screenshot, prerequisites, quickstart, env vars, architecture diagram, "how swaps work on Hedera" (association, WHBAR, tinybar vs weibar), project structure, troubleshooting, Hashscan proof link
- [x] `docs/components.md`: every component and hook with props and examples (screenshots TODO)
- [x] `docs/customize.md`: swap the DEX out, add a token, change the fee, add a pool, go to mainnet
- [x] `docs/architecture.md`: contract and frontend flow diagrams
- [x] `AGENTS.md`: repo map, commands, conventions, do and don't for AI agents (replace the stale scaffold text)
- [x] Comments only where the code is non-obvious (reviewed while writing the docs)

### Phase 4: gate verification (run Oct 3 on a clean scaffold; uncommitted changes)
- [x] Template command run from a clean directory with `--ci`. **Found and fixed a gate-breaking bug:** `template.json` had no top-level `name`, which the CLI requires, so scaffolding failed. Added `name`, `description`, `version`, `requirements` and an `outro`
- [ ] Re-run the command against GitHub once `template.json` is on `main` and the repo is public. The repo is **private**, so the public command returns 404 (it only worked locally with `CREATE_SCAFFOLD_HBAR_TEMPLATE_DIR` and with a `gh` token via `GIGET_AUTH`)
- [x] `npm install --legacy-peer-deps`, `next:lint`, `next:check-types`, 18 unit tests and `next:build` pass in the clean app. `hardhat:lint` has 0 errors and 3 warnings (CI does not fail on warnings)
- [x] App boots; `/`, `/swap`, `/pools`, `/history`, `/docs`, `/debug` and `/api/health` return 200
- [x] `template.json` valid, README and AGENTS present, MIT licence with the original and our copyright lines
- [x] No committed `.env` or keystore. The only key-like string is the public Hardhat default account in `hardhat.config.ts`
- [x] Hashscan link in the README: SwapHelper deployed on testnet at `0x206bf34BA9c73dfC14c7847ad202a271c8105b30`, swap tx `0x1bd1c348…b4f2` (1 HBAR to SAUCE)
- [x] Hardhat contract tests: 26 passing
- [ ] `PLAN.md`, `.agents/` and `.claude/` ship inside generated projects. Decide whether to keep them

## Winning plan (v2): from a swap demo to a money-movement kit

Why the current kit will not win on its own: the rubric pays for **load-bearing integration (35)**, **docs (30)** and **service depth (15)**, and says composing services beats a single one. We have one contract and HTS association. Many entrants will ship "a swap UI". We stand out by being the kit that **moves value on Hedera in any token, on a schedule, with no keeper**, with proof for every claim.

**Positioning.** hedera-swap-kit: swap, pay, pay out and schedule on Hedera. SaucerSwap is the engine, HTS is the asset layer, the Hedera Schedule Service (HSS) is the automation layer.

### Use cases (each is a page, a contract path, a docs guide and a Hashscan proof)
| Use case | Route | What it does | Services |
| --- | --- | --- | --- |
| **Swap** (done) | `/swap` | HBAR, token and token to HBAR swaps | SaucerSwap, HTS, mirror node |
| **Pay in any token** | `/pay` | Buyer pays with any HTS token, merchant receives the token they choose. Payment links: `/pay?to=0x..&token=0.0.x&amount=10&order=123` | SaucerSwap, HTS, mirror node |
| **Payouts** | `/payouts` | One funding token paid out to many recipients, each in their preferred token. CSV in, quotes per row, one batch | SaucerSwap, HTS |
| **Auto-buy (DCA)** | `/dca` | "Buy 10 HBAR of SAUCE every day for 7 days." The contract schedules its own next run through HSS. No bot | **HSS**, SaucerSwap, HTS |
| **Buy a token** | `/buy` | Embeddable on-ramp for a project's own token: `SwapWidget` with a fixed output token, set by env or query | SaucerSwap |

The DCA with HSS is the headline. It is the only one that needs a Hedera-only capability, and the proof (a swap executed by the network itself, not by our wallet) is something a judge can check on Hashscan.

### Command line
Root npm scripts that work after `npm create scaffold-hbar@latest -- --template ayushsingh82/hedera-swap-kit`:
| Command | Does |
| --- | --- |
| `npm run init` | Creates a deployer wallet, writes `.env`, prints the address and the faucet link, checks the balance |
| `npm run doctor` | Checks Node version, `.env`, balance, deployment, mirror node and SaucerSwap reachability, with a fix hint per failure |
| `npm run deploy:testnet` | Deploys every contract and records addresses |
| `npm run demo:swap`, `demo:pay`, `demo:payout`, `demo:dca` | Runs one real testnet transaction per use case and prints the Hashscan link |
| `npm run dev` | Starts the app |

### Progress (Oct 3)
- [x] HSS spike: a contract schedules itself and the network runs it. Needs the contract to hold gas limit x price at each run, and a rescheduling run uses about 1.4M gas
- [x] `/buy`, `/pay` and the Use cases menu
- [x] `ScheduledSwap` (HSS auto-buy): 17 tests against a mock Schedule Service, deploy script, `/dca` page. **Deployed on testnet** (`0.0.10838897`)
- [x] `BatchPayout`: 9 tests, deploy script, `/payouts` page with per-row checks. **Deployed on testnet** (`0.0.10838907`). **Live proof:** two payments in one batch, `0x6b8e5a07…ff5c`
- [x] CLI: `init`, `doctor`, `deploy:testnet`, `demo:swap|pay|payout|dca` (root npm scripts)
- [x] Docs: README, `docs/use-cases.md`, architecture and customize updates, in-app guides for every use case, AGENTS.md
- [x] Landing page lists the use cases; Block Explorer link only shows on the local network
- [x] Findings that changed the code: new accounts auto-associate tokens (the kit no longer asks needlessly); paying an address with no account aborts a whole batch (`INVALID_ALIAS_KEY`, now checked); ethers' default `maxFeePerGas` doubles the gas reserve (scripts cap it)
- [x] Auto-buy is done: contract deployed, page built, 17 tests. A recorded live multi-run is optional and left to `npm run demo:dca`
- [ ] `demo:pay` and the `/pay`, `/buy`, `/dca`, `/payouts` pages clicked through with a real wallet
- [ ] Make the repo public, re-run the template command from GitHub

### Build order (cut from the bottom; docs are never cut)
1. **Gate first.** Make the repo public, re-run the template command from GitHub, keep CI green. A failed gate means no prize, whatever else we build.
2. **HSS spike (1 to 2 hours).** Prove a contract can `scheduleCall` itself on testnet. If it fails, DCA falls back to `executeSwap` callable by anyone (keeper style) and we document it. Decide before building the rest.
3. **`PaymentRouter` contract + `/pay`.** Pay in any token, with `orderId` in the event so a merchant can match payments.
4. **`ScheduledSwap` contract + `/dca`** (HSS self-rescheduling swap, runs read from the mirror node).
5. **Payouts:** `payout(recipients, amounts, paths)` and `/payouts` (CSV).
6. **`/buy` widget:** configuration of `SwapWidget`, about an hour.
7. **CLI scripts:** `init`, `doctor`, `deploy:testnet`, `demo:*`.
8. **Docs:** one guide per use case (in `docs/` and `/docs`), a 5-minute tutorial, an architecture diagram per flow, a "proof" table with one Hashscan link per use case, AGENTS.md recipes ("add a use case", "swap the DEX").
9. **Polish:** tests for every new contract path, remove `PLAN.md` and internal notes from the template, mobile check, screenshots or a short screen recording.

### What judges should see
- Scaffolds and runs in one command, then `npm run init` and `npm run doctor` tell you exactly what is missing.
- Four Hashscan links, one per use case, and one of them is a swap the network executed on its own.
- Each use case has a guide that takes a stranger from zero to a working transaction.
- Tests pass, lint is clean, no dead code.

### Risks
- **HSS on testnet** may behave differently from the docs. Mitigation: the spike comes first, with a documented fallback.
- **Thin testnet liquidity** (only a few pools). Mitigation: demos use the WHBAR/SAUCE pool that has reserves.
- **Scope.** Five use cases in about 45 hours. Mitigation: `/buy` is configuration, payouts reuse the swap path code, and the cut order above applies.
- **Gas cost.** Token to HBAR costs about 1.4 HBAR on testnet. Demos should prefer HBAR to token and token to token.
- Do not use smart contract calls inside an Atomic Batch (deprecated).

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
