"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/shared/logo-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const POOL_SEGMENTS = 24;
const POOL_FILLED = 17;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await loginAction({ email, password });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setError("Invalid email or password");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-bg text-text">
      <section className="flex min-w-0 flex-1 basis-[560px] flex-col justify-between gap-12 border-r border-border bg-surface px-8 py-10 sm:px-14 sm:py-14">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10 rounded-xl" />
          <div className="font-display text-xl font-bold tracking-tight">
            EVerified
          </div>
        </div>

        <div>
          <p className="mb-5 font-mono text-xs font-medium tracking-[0.16em] text-accent-text">
            RECRUITMENT CRM + CONTRACT PAYROLL
          </p>
          <h1 className="max-w-[620px] font-display text-[clamp(3rem,6vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.03em]">
            Keep the pipeline charged.
          </h1>
          <p className="mt-6 max-w-[460px] text-lg leading-normal text-muted">
            One console for sourcing technicians, tracking every call, and
            running payroll for the people who keep EVs on the road.
          </p>
        </div>

        <div className="max-w-[560px]">
          <div className="flex gap-[5px]">
            {Array.from({ length: POOL_SEGMENTS }, (_, i) => (
              <div
                key={i}
                className={
                  i < POOL_FILLED
                    ? "h-[34px] flex-1 rounded-[4px] bg-primary"
                    : "h-[34px] flex-1 rounded-[4px] bg-border-strong"
                }
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between font-mono text-xs font-medium tracking-[0.08em] text-muted">
            <span>LEAD POOL</span>
            <span>READY TO DIAL</span>
          </div>
        </div>
      </section>

      <section className="relative flex min-w-0 flex-1 basis-[480px] items-center justify-center px-6 py-16">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <form onSubmit={onSubmit} className="w-full max-w-[400px]">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Sign in
          </h2>
          <p className="mb-8 mt-2.5 text-[15px] text-muted">
            Use your work credentials to open the console.
          </p>

          <Label htmlFor="email" className="mb-2 block text-[13px] font-semibold">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="h-[50px] rounded-xl bg-surface px-4 text-[15px]"
          />

          <Label
            htmlFor="password"
            className="mb-2 mt-5 block text-[13px] font-semibold"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className="h-[50px] rounded-xl bg-surface px-4 pr-12 text-[15px]"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="mt-7 h-[52px] w-full rounded-xl text-[15px]"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
            {pending ? null : <ArrowRight className="size-[18px]" />}
          </Button>
        </form>
      </section>
    </div>
  );
}
