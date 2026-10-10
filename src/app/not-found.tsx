import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted">
        That URL does not exist or you do not have access to it.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
