import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { EmployeeShell } from "@/components/shared/employee-shell";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const hideNav = session.user.mustChangePassword;

  return (
    <EmployeeShell
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
      }}
      hideNav={hideNav}
    >
      {children}
    </EmployeeShell>
  );
}
