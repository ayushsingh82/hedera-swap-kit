/**
 * First-run setup: creates a throwaway testnet deployer wallet, saves its key to packages/hardhat/.env (which is
 * git-ignored), and tells you where to get testnet HBAR. Safe to run again: it never replaces an existing key.
 *
 *   npm run init
 */
import * as fs from "fs";
import * as path from "path";
import { Wallet } from "ethers";

const ENV_PATH = path.join(__dirname, "..", ".env");
const EXAMPLE_PATH = path.join(__dirname, "..", ".env.example");
const KEY_NAME = "__RUNTIME_DEPLOYER_PRIVATE_KEY";
const MIRROR = "https://testnet.mirrornode.hedera.com";

async function balanceOf(address: string): Promise<number | undefined> {
  try {
    const response = await fetch(`${MIRROR}/api/v1/accounts/${address}`);
    if (response.status === 404) return 0;
    if (!response.ok) return undefined;
    const body = (await response.json()) as { balance: { balance: number } };
    return body.balance.balance / 1e8;
  } catch {
    return undefined;
  }
}

async function main() {
  if (!fs.existsSync(ENV_PATH)) {
    fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
    console.log("Created packages/hardhat/.env from .env.example");
  }

  let env = fs.readFileSync(ENV_PATH, "utf8");
  const existing = env.match(new RegExp(`^${KEY_NAME}=(0x[0-9a-fA-F]{64})\\s*$`, "m"))?.[1];

  let address: string;
  if (existing) {
    address = new Wallet(existing).address;
    console.log(`A deployer key is already set. Account: ${address}`);
  } else {
    const wallet = Wallet.createRandom();
    address = wallet.address;
    const line = `${KEY_NAME}=${wallet.privateKey}`;
    const keyLine = new RegExp(`^${KEY_NAME}=.*$`, "m");
    env = keyLine.test(env) ? env.replace(keyLine, line) : `${env.trimEnd()}\n${line}\n`;
    fs.writeFileSync(ENV_PATH, env);
    console.log(`Created a deployer wallet and saved its key to packages/hardhat/.env (never commit it).`);
    console.log(`Account: ${address}`);
  }

  const balance = await balanceOf(address);
  console.log(`Testnet balance: ${balance === undefined ? "unknown (mirror node unreachable)" : `${balance} HBAR`}`);

  if (!balance || balance < 5) {
    console.log("\nFund it with testnet HBAR (about 20 is plenty):");
    console.log("  https://portal.hedera.com/faucet");
    console.log(`  address: ${address}`);
  }
  console.log("\nNext:");
  console.log("  npm run doctor           check the setup");
  console.log("  npm run deploy:testnet   deploy the contracts");
  console.log("  npm run next:dev         start the app");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
