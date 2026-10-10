/** Display masks for sensitive payroll fields (safe for client). */

export function maskAadhaar(last4: string | null | undefined): string {
  if (!last4) return "—";
  return `XXXX XXXX ${last4}`;
}

export function maskPan(last4: string | null | undefined): string {
  if (!last4) return "—";
  return `XXXXX${last4}`;
}

export function maskAccount(last4: string | null | undefined): string {
  if (!last4) return "—";
  return `XXXXXX${last4}`;
}
