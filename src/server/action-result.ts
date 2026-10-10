export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, error: { code, message, fieldErrors } };
}
