"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { changePasswordAction } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ forced }: { forced?: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setPending(true);
    try {
      const result = await changePasswordAction({
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSuccess(true);
      router.refresh();
      if (forced) {
        router.push("/app");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={pending}
        />
        <p className="text-xs text-muted">
          At least 10 characters, including one number.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
        />
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-success-strong" role="status">
          Password updated.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
