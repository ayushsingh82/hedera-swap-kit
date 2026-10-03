import { parseAmount } from "./math";
import { HBAR, SwapToken } from "./tokens";
import { isAddress, stringToHex } from "viem";

export const MAX_PAYOUTS = 50;
/** Measured on testnet: an HBAR to token swap through SwapHelper uses about 0.2M gas. This leaves room. */
const BASE_GAS = 500_000n;
const GAS_PER_PAYMENT = 450_000n;

export const payoutGas = (payments: number) => BASE_GAS + GAS_PER_PAYMENT * BigInt(payments);

export type PayoutRow = {
  /** 1-based line number in the pasted text, for error messages. */
  line: number;
  recipient?: `0x${string}`;
  /** HBAR to spend on this payment, in tinybar. */
  amountIn?: bigint;
  token?: SwapToken;
  error?: string;
};

/** Finds a token by Hedera id or symbol (case-insensitive). "HBAR" is the native coin. */
export function findToken(tokens: SwapToken[], key: string): SwapToken | undefined {
  const wanted = key.trim();
  if (!wanted) return undefined;
  if (wanted.toLowerCase() === "hbar") return HBAR;
  return tokens.find(t => t.id === wanted || t.symbol.toLowerCase() === wanted.toLowerCase());
}

/**
 * Parses pasted payouts: one per line as `address, amount, token`. The amount is the HBAR spent on that
 * payment. The token (a symbol or Hedera id, or HBAR for a plain transfer) falls back to `defaultToken`.
 * Commas, tabs or semicolons separate the columns. Blank lines, `#` comments and a header line are skipped.
 */
export function parsePayoutCsv(text: string, tokens: SwapToken[], defaultToken: SwapToken): PayoutRow[] {
  const rows: PayoutRow[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const content = raw.trim();
    if (!content || content.startsWith("#")) return;

    const [address = "", amount = "", tokenKey = ""] = content.split(/[,\t;]/).map(cell => cell.trim());
    // The first non-empty line may be a header such as "address,amount,token".
    if (rows.length === 0 && !isAddress(address) && /^(address|recipient|to|wallet)$/i.test(address)) return;

    const row: PayoutRow = { line: index + 1 };
    rows.push(row);

    if (rows.length > MAX_PAYOUTS) return void (row.error = `Only ${MAX_PAYOUTS} payments fit in one batch`);
    if (!isAddress(address)) return void (row.error = "Not a valid EVM address");
    row.recipient = address;

    const amountIn = parseAmount(amount, HBAR.decimals);
    if (!amountIn || amountIn <= 0n) return void (row.error = "Enter an HBAR amount above zero");
    row.amountIn = amountIn;

    const token = tokenKey ? findToken(tokens, tokenKey) : defaultToken;
    if (!token) return void (row.error = `Unknown token "${tokenKey}"`);
    row.token = token;
  });

  return rows;
}

/** Tags a batch with up to 31 bytes of text (it is stored as a bytes32). Empty text gives the zero value. */
export function batchIdToBytes32(text: string): `0x${string}` | undefined {
  const trimmed = text.trim();
  if (new TextEncoder().encode(trimmed).length > 31) return undefined;
  return trimmed ? stringToHex(trimmed, { size: 32 }) : `0x${"0".repeat(64)}`;
}
