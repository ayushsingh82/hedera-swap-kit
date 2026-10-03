"use client";

import { useMemo } from "react";
import { TokenIcon } from "./TokenSelect";
import { ApiPool, usePools } from "~~/hooks/swap";
import { formatAmount } from "~~/utils/swap/math";

const usd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const tvlUsd = (pool: ApiPool) =>
  (Number(pool.amountA) / 10 ** pool.tokenA.decimals) * (pool.tokenA.priceUsd ?? 0) +
  (Number(pool.amountB) / 10 ** pool.tokenB.decimals) * (pool.tokenB.priceUsd ?? 0);

/** SaucerSwap V2 pools with fee tier, reserves and TVL. Pools without liquidity are hidden. */
export const PoolsTable = ({ limit = 25 }: { limit?: number }) => {
  const { pools, isLoading, error } = usePools();

  const rows = useMemo(
    () =>
      pools
        .filter(p => BigInt(p.liquidity) > 0n)
        .map(pool => ({ pool, tvl: tvlUsd(pool) }))
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, limit),
    [pools, limit],
  );

  if (isLoading) return <span className="loading loading-spinner mx-auto block" />;
  if (error)
    return (
      <p role="alert" className="text-center text-sm text-error">
        Could not load pools: {error.message}
      </p>
    );
  if (!rows.length) return <p className="text-center text-sm opacity-60">No pools with liquidity on this network.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Pool</th>
            <th>Fee</th>
            <th className="text-right">Reserves</th>
            <th className="text-right">TVL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ pool, tvl }) => (
            <tr key={pool.contractId}>
              <td>
                <span className="flex items-center gap-2">
                  <span className="flex -space-x-2">
                    <TokenIcon token={{ ...pool.tokenA, address: "0x", name: pool.tokenA.symbol }} size={24} />
                    <TokenIcon token={{ ...pool.tokenB, address: "0x", name: pool.tokenB.symbol }} size={24} />
                  </span>
                  <span className="font-medium">
                    {pool.tokenA.symbol.trim()} / {pool.tokenB.symbol.trim()}
                  </span>
                </span>
              </td>
              <td>{pool.fee / 10_000}%</td>
              <td className="text-right text-xs tabular-nums">
                {formatAmount(BigInt(pool.amountA), pool.tokenA.decimals, 2)} {pool.tokenA.symbol.trim()}
                <br />
                {formatAmount(BigInt(pool.amountB), pool.tokenB.decimals, 2)} {pool.tokenB.symbol.trim()}
              </td>
              <td className="text-right tabular-nums">{tvl > 0 ? usd(tvl) : "n/a"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
