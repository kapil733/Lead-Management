import "server-only";

import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { IMPORT_MAX_BYTES, importCitiesSchema } from "@/lib/validators/leads";

export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin only" } },
        { status: 403 },
      ),
    };
  }
  return {
    ok: true as const,
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: session.user.role,
    },
  };
}

export async function readUploadFile(request: Request): Promise<
  | { ok: true; buffer: Buffer; fileName: string }
  | { ok: false; response: NextResponse }
> {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION", message: "file is required" },
        },
        { status: 400 },
      ),
    };
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `File exceeds ${IMPORT_MAX_BYTES / (1024 * 1024)} MB limit`,
          },
        },
        { status: 400 },
      ),
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { ok: true, buffer, fileName: file.name };
}

export function parseCitiesField(
  form: FormData,
): { ok: true; cities: string[] | undefined } | { ok: false; error: string } {
  const raw = form.get("cities");
  if (raw == null || raw === "") return { ok: true, cities: undefined };
  if (typeof raw !== "string") {
    return { ok: false, error: "Invalid cities" };
  }
  try {
    const parsed = importCitiesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false, error: "Invalid cities" };
    return { ok: true, cities: parsed.data };
  } catch {
    return { ok: false, error: "Invalid cities" };
  }
}

export function parseMappingField(
  form: FormData,
): Record<string, string> | null {
  const raw = form.get("mapping");
  if (typeof raw !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}
