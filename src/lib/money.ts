/** Money helpers — always integer paise. Never use floats for INR amounts. */

export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error("toPaise: rupees must be finite");
  }
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(paise: number): string {
  return inrFormatter.format(fromPaise(paise));
}
