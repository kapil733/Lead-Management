import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const forced = params.force === "1" || session.user.mustChangePassword;

  return (
    <div className="space-y-6">
      {forced ? (
        <div
          className="rounded-[var(--radius-card)] border border-warning bg-warning-soft px-4 py-3 text-sm text-text"
          role="status"
        >
          You must change your temporary password before continuing.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold leading-8">
            Profile
          </CardTitle>
          <CardDescription>Account details and password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Name</p>
              <p className="text-sm font-medium">{session.user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="text-sm font-medium tabular">{session.user.email}</p>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold leading-6">
              Change password
            </h2>
            <ChangePasswordForm forced={forced} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
