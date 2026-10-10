/**
 * Payroll rounding — single source of truth.
 * All money inputs/outputs are integer paise unless noted.
 */

/** Round half up to nearest rupee (100 paise). Accepts fractional paise from rate × base. */
export function roundHalfUpRupee(paise: number): number {
  if (!Number.isFinite(paise)) throw new Error("roundHalfUpRupee: non-finite");
  if (paise >= 0) {
    return Math.floor(paise / 100 + 0.5) * 100;
  }
  return -Math.floor(Math.abs(paise) / 100 + 0.5) * 100;
}

/** Round UP (ceil) to next rupee. */
export function ceilRupee(paise: number): number {
  if (!Number.isFinite(paise)) throw new Error("ceilRupee: non-finite");
  if (paise <= 0) return 0;
  return Math.ceil(paise / 100) * 100;
}

/** Round to nearest paise (half up). */
export function roundNearestPaise(value: number): number {
  if (!Number.isFinite(value)) throw new Error("roundNearestPaise: non-finite");
  return value >= 0
    ? Math.floor(value + 0.5)
    : -Math.floor(Math.abs(value) + 0.5);
}
