"use client";

import { useState } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

export type SwapSettings = {
  /** Slippage tolerance in basis points. 50 = 0.5%. */
  slippageBps: number;
  /** How long the swap stays valid, in minutes. */
  deadlineMinutes: number;
};

export const DEFAULT_SETTINGS: SwapSettings = { slippageBps: 50, deadlineMinutes: 10 };

const PRESETS = [10, 50, 100];
const MAX_SLIPPAGE_BPS = 5_000;

type SlippageSettingsProps = {
  value: SwapSettings;
  onChange: (settings: SwapSettings) => void;
};

/** A collapsible panel for slippage presets, a custom slippage value and the transaction deadline. */
export const SlippageSettings = ({ value, onChange }: SlippageSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const setSlippage = (slippageBps: number) => onChange({ ...value, slippageBps });
  const isCustom = !PRESETS.includes(value.slippageBps);

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle"
        aria-label="Swap settings"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Cog6ToothIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-4 z-10 mt-1 w-72 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-xl">
          <p className="mb-2 text-sm font-semibold">Slippage tolerance</p>
          <div className="flex gap-2">
            {PRESETS.map(bps => (
              <button
                key={bps}
                type="button"
                className={`btn btn-sm flex-1 ${value.slippageBps === bps ? "btn-primary" : "btn-outline"}`}
                onClick={() => {
                  setCustom("");
                  setSlippage(bps);
                }}
              >
                {bps / 100}%
              </button>
            ))}
            <label
              className={`input input-sm input-bordered flex w-24 items-center gap-1 ${isCustom ? "input-primary" : ""}`}
            >
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custom"
                aria-label="Custom slippage percent"
                value={custom}
                onChange={e => {
                  const text = e.target.value.replace(",", ".");
                  setCustom(text);
                  const percent = Number(text);
                  if (text !== "" && Number.isFinite(percent) && percent > 0) {
                    setSlippage(Math.min(Math.round(percent * 100), MAX_SLIPPAGE_BPS));
                  }
                }}
              />
              %
            </label>
          </div>
          {value.slippageBps > 300 && (
            <p className="mt-2 text-xs text-warning">
              High slippage can let others trade against you at a worse price.
            </p>
          )}

          <p className="mb-2 mt-4 text-sm font-semibold">Transaction deadline</p>
          <label className="input input-sm input-bordered flex w-32 items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              aria-label="Deadline in minutes"
              value={value.deadlineMinutes}
              onChange={e => {
                const minutes = Math.min(60, Math.max(1, Math.round(Number(e.target.value) || 1)));
                onChange({ ...value, deadlineMinutes: minutes });
              }}
            />
            min
          </label>
        </div>
      )}
    </div>
  );
};
