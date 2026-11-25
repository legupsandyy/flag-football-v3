import { getSetting } from "./settings";

export type PayoutKey = "dk" | "survivor" | "pickem" | "rounds";
export type PayoutConfig = Record<PayoutKey, { buyIn: number; prizes: number[] }>;

export const PAYOUT_KEYS: PayoutKey[] = ["dk", "survivor", "pickem", "rounds"];

export const PAYOUT_LABELS: Record<PayoutKey, string> = {
  dk: "DK Slates",
  survivor: "Survivor (overall)",
  pickem: "Pick'em (ATS + O/U)",
  rounds: "Survivor round winners",
};

export const ROUND_PRIZE_NAMES = ["Wild Card", "Divisional", "Conference"];

// The structure agreed for this year: $150 buy-in, 10 players.
export const DEFAULT_PAYOUTS: PayoutConfig = {
  dk: { buyIn: 50, prizes: [250, 150, 100] },
  survivor: { buyIn: 50, prizes: [250, 150, 100] },
  pickem: { buyIn: 35, prizes: [250, 100] },
  rounds: { buyIn: 15, prizes: [50, 50, 50] },
};

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

export function prizeName(key: PayoutKey, i: number) {
  if (key === "rounds") return ROUND_PRIZE_NAMES[i] ?? `Round ${i + 1}`;
  return ORDINALS[i] ?? `${i + 1}th`;
}

export async function getPayouts(): Promise<PayoutConfig> {
  const out: PayoutConfig = JSON.parse(JSON.stringify(DEFAULT_PAYOUTS));
  try {
    const saved = JSON.parse((await getSetting("payouts")) || "{}");
    for (const k of PAYOUT_KEYS) {
      const s = saved?.[k];
      if (!s) continue;
      // Ignore the old saved round prizes ($9 buy-in, $30 each) so the new $50 prizes show.
      if (k === "rounds" && s.buyIn === 9 && Array.isArray(s.prizes) && s.prizes.every((n: unknown) => n === 30)) continue;
      if (typeof s.buyIn === "number" && s.buyIn >= 0) out[k].buyIn = s.buyIn;
      if (Array.isArray(s.prizes) && s.prizes.every((n: unknown) => typeof n === "number" && n >= 0)) out[k].prizes = s.prizes;
    }
  } catch {
    // fall back to the defaults
  }
  return out;
}

export const money = (n: number) =>
  "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
