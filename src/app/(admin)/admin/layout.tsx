import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Role } from "@prisma/client";
import { AdminShell } from "@/components/shared/admin-shell";
import { getConsoleChrome } from "@/server/dashboard/chrome";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== Role.ADMIN) {
    redirect("/app");
  }

  const chrome = await getConsoleChrome();

  return (
    <AdminShell
      user={{
        name: session.user.name ?? "Admin",
        email: session.user.email ?? "",
      }}
      chrome={chrome}
    >
      {children}
    </AdminShell>
  );
}
