import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Role } from "@prisma/client";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role === Role.ADMIN) {
    redirect("/admin/dashboard");
  }
  redirect("/app");
}
