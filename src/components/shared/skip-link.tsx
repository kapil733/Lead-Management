/** Visually hidden until focused — first tab stop for keyboard users. */
export function SkipLink({ href = "#main-content" }: { href?: string }) {
  return (
    <a href={href} className="skip-link">
      Skip to main content
    </a>
  );
}
