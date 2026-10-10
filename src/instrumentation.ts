export async function register() {
  // Validate env at process boot (Next.js instrumentation hook).
  await import("@/env");
}
