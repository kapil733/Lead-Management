/**
 * Normalise Indian mobile numbers to 10 digits matching /^[6-9]\d{9}$/.
 * Strips spaces/dashes, leading +91, 91 (12 digits), or 0.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let candidate = digits;
  if (candidate.length === 12 && candidate.startsWith("91")) {
    candidate = candidate.slice(2);
  } else if (candidate.length === 11 && candidate.startsWith("0")) {
    candidate = candidate.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(candidate)) {
    return null;
  }
  return candidate;
}

export const FRIEND_PHONE_ERROR =
  "Enter a 10-digit mobile starting with 6, 7, 8, or 9";

/** Still typing a number that can become a valid mobile. */
export function isIncompletePhone(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || normalisePhone(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return false;
  if (digits.startsWith("91")) return digits.length < 12;
  if (digits.startsWith("0")) return digits.length < 11;
  return digits.length < 10;
}

/**
 * Error for a friend-number field.
 * Incomplete numbers stay quiet until the field is left (`showIncomplete`).
 */
export function friendPhoneError(
  input: string,
  showIncomplete: boolean,
): string | undefined {
  const trimmed = input.trim();
  if (!trimmed || normalisePhone(trimmed)) return undefined;
  if (!showIncomplete && isIncompletePhone(trimmed)) return undefined;
  return FRIEND_PHONE_ERROR;
}

/** Display as `98765 43210` (5 + 5). */
export function formatPhoneDisplay(phone10: string): string {
  if (phone10.length !== 10) return phone10;
  return `${phone10.slice(0, 5)} ${phone10.slice(5)}`;
}
