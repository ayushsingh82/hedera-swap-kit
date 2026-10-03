/**
 * Checks the setup and says how to fix anything that is missing. Exits with a failure code if a required check fails.
 *
 *   npm run doctor
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Wallet } from "ethers";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MIRROR = "https://testnet.mirrornode.hedera.com";
const SAUCER_API = "https://test-api.saucerswap.finance";
const MIN_NODE = [20, 18, 3];
const CONTRACTS = ["SwapHelper", "ScheduledSwap", "BatchPayout"];

type Result = { ok: boolean; warn?: boolean; label: string; fix?: string };
const results: Result[] = [];
const pass = (label: string) => results.push({ ok: true, label });
const fail = (label: string, fix: string) => results.push({ ok: false, label, fix });
const warn = (label: string, fix: string) => results.push({ ok: true, warn: true, label, fix });

async function reachable(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(10_000) })).ok;
  } catch {
    return false;
  }
}

function atLeast(version: string, min: number[]): boolean {
  const parts = version.split(".").map(Number);
  for (let i = 0; i < min.length; i++) {
    if ((parts[i] ?? 0) !== min[i]) return (parts[i] ?? 0) > min[i];
  }
  return true;
}

async function main() {
  const node = process.versions.node;
  if (atLeast(node, MIN_NODE)) pass(`Node ${node}`);
  else fail(`Node ${node} is too old`, `Install Node ${MIN_NODE.join(".")} or newer`);

  const key = process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY;
  if (!fs.existsSync(path.join(__dirname, "..", ".env"))) {
    fail("packages/hardhat/.env is missing", "Run: npm run init");
  } else if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    fail("No deployer key in .env", "Run: npm run init");
  } else {
    const address = new Wallet(key).address;
    pass(`Deployer account ${address}`);
    try {
      const response = await fetch(`${MIRROR}/api/v1/accounts/${address}`);
      const balance = response.ok
        ? ((await response.json()) as { balance: { balance: number } }).balance.balance / 1e8
        : 0;
      if (balance >= 5) pass(`Balance ${balance.toFixed(2)} HBAR`);
      else if (balance > 0)
        warn(
          `Balance ${balance.toFixed(2)} HBAR is low`,
          "Auto-buy needs about 5 HBAR per plan. Faucet: https://portal.hedera.com/faucet",
        );
      else fail("The deployer account has no HBAR", `Fund ${address} at https://portal.hedera.com/faucet`);
    } catch {
      warn("Could not read the balance", "Check your connection");
    }
  }

  if (await reachable(`${MIRROR}/api/v1/network/nodes?limit=1`)) pass("Hedera testnet mirror node reachable");
  else fail("Hedera testnet mirror node unreachable", "Check your connection or try again later");
  if (await reachable(`${SAUCER_API}/tokens`)) pass("SaucerSwap testnet API reachable");
  else fail("SaucerSwap testnet API unreachable", "Check your connection or try again later");

  for (const name of CONTRACTS) {
    const file = path.join(__dirname, "..", "deployments", "hederaTestnet", `${name}.json`);
    if (!fs.existsSync(file)) {
      fail(`${name} is not deployed on testnet`, "Run: npm run deploy:testnet");
      continue;
    }
    const { address } = JSON.parse(fs.readFileSync(file, "utf8")) as { address: string };
    if (await reachable(`${MIRROR}/api/v1/contracts/${address}`)) pass(`${name} deployed at ${address}`);
    else fail(`${name} is recorded at ${address} but not found on testnet`, "Run: npm run deploy:testnet");
  }

  for (const { ok, warn: isWarn, label, fix } of results) {
    console.log(`${ok ? (isWarn ? "!" : "✔") : "✖"} ${label}${fix ? `\n    ${fix}` : ""}`);
  }
  const failed = results.filter(r => !r.ok).length;
  console.log(failed ? `\n${failed} problem${failed === 1 ? "" : "s"} to fix.` : "\nAll good.");
  process.exitCode = failed ? 1 : 0;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
