# Plan: swap-kit (SaucerSwap swap template for scaffold-hbar)

Built for the Hedera Scaffold-HBAR Template Bounty. Deadline: **Sun Oct 4, 11:59 PM ET**.
Rubric: ecosystem integration 35, docs 30, code quality 20, Hedera service depth 15.

## What it is
A forkable scaffold-hbar template for apps that need token swaps on Hedera (wallets, payment apps, game stores). It wraps the SaucerSwap V2 router and handles the two Hedera-specific problems EVM developers hit: HTS token association and WHBAR wrapping.

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

### Phase 1: contracts (`packages/hardhat`) (in progress)
- [x] Replace the blank template's sample contracts with `SwapHelper.sol`: wraps the V2 SwapRouter `exactInput`, HBAR in via msg.value, HBAR out via the router's `unwrapWHBAR`, emits events
- [x] Per-network address config in one file (`utils/saucerswap.ts`)
- [x] Hardhat deploy script and unit tests (14 passing)
- [x] A script that runs one real testnet swap and prints the Hashscan link (`npm run hardhat:swap-testnet`), written but **not yet run**: needs a funded testnet key
- [x] A testnet pool with real reserves: V2 pool 0.0.2661057 (WHBAR/SAUCE, 0.30%)

### Phase 2: frontend (`packages/nextjs`)
- [ ] Swap widget: token select, quote (QuoterV2), slippage, execute
- [ ] HTS association check with one-click associate before swapping
- [ ] Mirror-node hooks for balances and recent swaps
- [ ] Routes for the gate: `/`, `/swap`, `/api/health`

### Phase 3: docs (30 points, treated as a product)
- [ ] `README.md`: prerequisites, quickstart, env vars, architecture diagram, "how swaps work on Hedera" (association, WHBAR), how to swap the DEX out, troubleshooting, Hashscan proof link
- [ ] `AGENTS.md`: repo map, commands, conventions, do and don't for AI agents
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
| Oct 3 | Phase 2, start Phase 3 |
| Oct 4 | Finish docs, Phase 4, push, submit before the deadline |

## Risks
- **Thin testnet liquidity:** seed our own pool, or fall back to a read-only quote and document it.
- **Time:** cut scope before docs. The add-liquidity UI is the first thing to drop.
- **Overlap with `cross-chain-dca`:** pitch this as a swap building block, not a strategy.
