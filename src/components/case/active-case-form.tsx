"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { CallOutcome } from "@prisma/client";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CaseTimer } from "@/components/case/case-timer";
import { RatingScale } from "@/components/case/rating-scale";
import { LeadSourceBadge } from "@/components/leads/status-badge";
import {
  formatPhoneDisplay,
  friendPhoneError,
  normalisePhone,
} from "@/lib/phone";
import {
  BIKE_TYPE_OPTIONS,
  DESIGNATION_SUGGESTIONS,
  type BikeTypeValue,
} from "@/lib/validators/cases";
import { claimNextCaseAction, closeCaseAction } from "@/server/cases/actions";
import { profileEntries } from "@/lib/lead-extra";
import { outcomeLabel, type PriorRemark } from "@/lib/outcomes";
import { formatDisplayDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { LeadSource } from "@prisma/client";

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: CallOutcome.CONNECTED, label: "Connected" },
  { value: CallOutcome.NO_ANSWER, label: "No answer" },
  { value: CallOutcome.SWITCHED_OFF, label: "Switched off" },
  { value: CallOutcome.WRONG_NUMBER, label: "Wrong number" },
  { value: CallOutcome.CALL_BACK_LATER, label: "Reconnect" },
];

type ReferralDraft = {
  phone: string;
  name: string;
  experienceText: string;
  designation: string;
  note?: string;
  blurred?: boolean;
};

type DraftState = {
  outcome: CallOutcome | null;
  rating: number | null;
  remarks: string;
  referrals: ReferralDraft[];
  /** Absent until the telecaller edits or the draft is saved. */
  city?: string;
  location?: string;
  bikeType?: BikeTypeValue | "";
};

type LeadInfo = {
  id: string;
  phone: string;
  name: string | null;
  city: string | null;
  location: string | null;
  bikeType: BikeTypeValue | null;
  trade: string | null;
  experienceYears: string | null;
  extra?: Record<string, string>;
  source: LeadSource;
  attempts: number;
};

type SuccessInfo = {
  caseId: string;
  outcome: string;
  rating: number | null;
  referralsSaved: number;
  referralNotes: string[];
  leadName: string | null;
};

function draftKey(caseId: string) {
  return `tc-case-draft:${caseId}`;
}

const EMPTY_DRAFT: DraftState = {
  outcome: null,
  rating: null,
  remarks: "",
  referrals: [],
};

function emptyFriend(): ReferralDraft {
  return { phone: "", name: "", experienceText: "", designation: "" };
}

const draftCache = new Map<string, { raw: string | null; draft: DraftState }>();

function parseDraft(raw: string | null): DraftState {
  if (!raw) return EMPTY_DRAFT;
  try {
    const parsed = JSON.parse(raw) as DraftState;
    const bikeType =
      parsed.bikeType === "PETROL_BIKE" ||
      parsed.bikeType === "EV_BIKE" ||
      parsed.bikeType === ""
        ? parsed.bikeType
        : undefined;
    return {
      outcome: parsed.outcome ?? null,
      rating: parsed.rating ?? null,
      remarks: parsed.remarks ?? "",
      referrals: parsed.referrals ?? [],
      ...(typeof parsed.city === "string" ? { city: parsed.city } : {}),
      ...(typeof parsed.location === "string"
        ? { location: parsed.location }
        : {}),
      ...(bikeType !== undefined ? { bikeType } : {}),
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

/** Stable snapshot for useSyncExternalStore. A fresh object every call loops React. */
function readDraft(caseId: string): DraftState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(draftKey(caseId));
  } catch {
    raw = null;
  }
  const cached = draftCache.get(caseId);
  if (cached && cached.raw === raw) return cached.draft;
  const draft = parseDraft(raw);
  draftCache.set(caseId, { raw, draft });
  return draft;
}

function subscribeDraft(caseId: string, onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === draftKey(caseId)) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function ActiveCaseForm({
  caseId,
  startedAt,
  maxAttempts,
  lead,
  priorRemarks,
}: {
  caseId: string;
  startedAt: string;
  maxAttempts: number;
  lead: LeadInfo;
  priorRemarks: PriorRemark[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const storedDraft = useSyncExternalStore(
    (onChange) => subscribeDraft(caseId, onChange),
    () => readDraft(caseId),
    () => EMPTY_DRAFT,
  );
  // Local edits take precedence over the stored snapshot after first interaction.
  const [localDraft, setLocalDraft] = useState<DraftState | null>(null);
  const draft = localDraft ?? storedDraft;
  const outcome = draft.outcome;
  const rating = draft.rating;
  const remarks = draft.remarks;
  const referrals = draft.referrals;
  const city = draft.city !== undefined ? draft.city : (lead.city ?? "");
  const location =
    draft.location !== undefined ? draft.location : (lead.location ?? "");
  const bikeType =
    draft.bikeType !== undefined ? draft.bikeType : (lead.bikeType ?? "");

  function patchDraft(patch: Partial<DraftState>) {
    setLocalDraft((prev) => ({ ...(prev ?? storedDraft), ...patch }));
  }

  const setOutcome = (value: CallOutcome | null) => patchDraft({ outcome: value });
  const setRating = (value: number | null) => patchDraft({ rating: value });
  const setRemarks = (value: string) => patchDraft({ remarks: value });
  const setReferrals = (
    value: ReferralDraft[] | ((rows: ReferralDraft[]) => ReferralDraft[]),
  ) => {
    setLocalDraft((prev) => {
      const base = prev ?? storedDraft;
      const next =
        typeof value === "function" ? value(base.referrals) : value;
      return { ...base, referrals: next };
    });
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [friendIndex, setFriendIndex] = useState<number | null>(null);
  const [friendForm, setFriendForm] = useState<ReferralDraft>(emptyFriend());
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Autosave every 2s
  useEffect(() => {
    const id = window.setInterval(() => {
      const payload: DraftState = {
        outcome,
        rating,
        remarks,
        referrals,
        city,
        location,
        bikeType,
      };
      localStorage.setItem(draftKey(caseId), JSON.stringify(payload));
    }, 2000);
    return () => window.clearInterval(id);
  }, [caseId, outcome, rating, remarks, referrals, city, location, bikeType]);

  // Keyboard 0-5 for rating when CONNECTED
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (outcome !== CallOutcome.CONNECTED) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key >= "0" && e.key <= "5") {
        setLocalDraft((prev) => ({
          ...(prev ?? readDraft(caseId)),
          rating: Number(e.key),
        }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [outcome, caseId]);

  const connected = outcome === CallOutcome.CONNECTED;
  const reconnect = outcome === CallOutcome.CALL_BACK_LATER;
  const remarksRequired = connected || reconnect;

  const canSubmit = useMemo(() => {
    if (!outcome) return false;
    if (connected && rating == null) return false;
    if (remarksRequired && remarks.trim().length < 3) return false;
    for (const row of referrals) {
      const hasOther =
        Boolean(row.name.trim()) ||
        Boolean(row.experienceText.trim()) ||
        Boolean(row.designation.trim());
      if (hasOther && !row.phone.trim()) return false;
      if (row.phone.trim() && !normalisePhone(row.phone)) return false;
    }
    return true;
  }, [outcome, connected, remarksRequired, rating, remarks, referrals]);

  const friendHint = useMemo(() => {
    for (const row of referrals) {
      if (row.phone.trim() && !normalisePhone(row.phone)) {
        return "Finish or remove the friend number";
      }
      const hasOther =
        Boolean(row.name.trim()) ||
        Boolean(row.experienceText.trim()) ||
        Boolean(row.designation.trim());
      if (hasOther && !row.phone.trim()) return "Add a phone for each friend";
    }
    return null;
  }, [referrals]);

  function openAddFriend() {
    setFriendIndex(null);
    setFriendForm(emptyFriend());
    setFriendOpen(true);
  }

  function openEditFriend(index: number) {
    const row = referrals[index];
    if (!row) return;
    setFriendIndex(index);
    setFriendForm({ ...row, note: undefined });
    setFriendOpen(true);
  }

  function saveFriend() {
    const phone = friendForm.phone.trim();
    const hasOther = Boolean(
      friendForm.name.trim() ||
        friendForm.experienceText.trim() ||
        friendForm.designation.trim(),
    );
    const normalised = normalisePhone(phone);
    const note =
      friendPhoneError(phone, true) ??
      (!phone && hasOther ? "Phone is required" : undefined) ??
      (!normalised ? "Enter a 10-digit mobile starting with 6–9" : undefined);
    if (note || !normalised) {
      setFriendForm((current) => ({ ...current, blurred: true, note }));
      return;
    }
    const next: ReferralDraft = {
      phone: normalised,
      name: friendForm.name.trim(),
      experienceText: friendForm.experienceText.trim(),
      designation: friendForm.designation.trim(),
    };
    if (friendIndex == null) {
      setReferrals((rows) => [...rows, next]);
    } else {
      setReferrals((rows) =>
        rows.map((row, i) => (i === friendIndex ? next : row)),
      );
    }
    setFriendOpen(false);
  }

  function deleteFriend(index: number) {
    setReferrals((rows) => rows.filter((_, i) => i !== index));
  }

  const closeHint = !canSubmit
    ? (friendHint ??
      (!outcome
        ? "Pick an outcome to close"
        : connected && rating == null
          ? "Add an interest rating"
          : remarksRequired && remarks.trim().length < 3
            ? reconnect
              ? "Add a remark so the next call has context"
              : "Remarks need at least 3 characters"
            : null))
    : null;

  function submitClose() {
    if (!outcome || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await closeCaseAction({
        caseId,
        outcome,
        rating: connected ? rating : null,
        remarks,
        city,
        location,
        bikeType,
        referrals: referrals
          .filter((r) => r.phone.trim() || r.name || r.experienceText || r.designation)
          .map((r) => ({
            phone: r.phone,
            name: r.name || undefined,
            experienceText: r.experienceText || undefined,
            designation: r.designation || undefined,
          })),
      });
      if (!result.ok) {
        setError(result.error.message);
        setConfirmOpen(false);
        toast.error(result.error.message);
        return;
      }
      localStorage.removeItem(draftKey(caseId));
      setConfirmOpen(false);
      setSuccess({
        caseId: result.data.caseId,
        outcome: result.data.outcome,
        rating: result.data.rating,
        referralsSaved: result.data.referralsSaved,
        referralNotes: result.data.referralNotes,
        leadName: lead.name,
      });
      for (const note of result.data.referralNotes) {
        toast.message(note);
      }
      router.refresh();
    });
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-success-soft text-success-strong">
            ✓
          </div>
          <CardTitle className="text-2xl font-semibold leading-8">
            Case closed
          </CardTitle>
          <CardDescription>
            {success.leadName ?? "Lead"} · {success.outcome.replaceAll("_", " ")}
            {success.rating != null ? ` · rating ${success.rating}` : ""}
            {success.referralsSaved > 0
              ? ` · ${success.referralsSaved} friend(s) saved`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await claimNextCaseAction();
                if (!result.ok) {
                  toast.error(result.error.message);
                  router.push("/app");
                  return;
                }
                setSuccess(null);
                router.push("/app/case");
                router.refresh();
              });
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Start next case
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/app")}
          >
            Back to home
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.7fr)] md:grid-rows-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-surface px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <span className="size-2 rounded-full bg-success" />
            Case in progress
          </span>
          <div className="flex items-center gap-4 font-mono text-xs text-muted">
            <span className="tabular">
              Attempt {Math.min(lead.attempts + 1, maxAttempts)} of {maxAttempts}
            </span>
            <LeadSourceBadge source={lead.source} />
            <CaseTimer startedAt={startedAt} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-bold capitalize leading-none tracking-tight">
              {lead.name ?? "Unknown name"}
            </h1>
            <p className="phone-no-select mt-2 font-mono text-3xl font-medium leading-none tracking-tight">
              {formatPhoneDisplay(lead.phone)}
            </p>
            {priorRemarks.length > 0 ? (
              <div className="mt-3 max-h-24 space-y-2 overflow-auto rounded-xl border border-border bg-surface-2 px-3 py-2">
                <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted">
                  PREVIOUS REMARKS
                </p>
                {priorRemarks.map((note) => (
                  <p key={note.id} className="text-sm leading-snug">
                    <span className="text-muted">
                      {outcomeLabel(note.outcome)} ·{" "}
                      {formatDisplayDateTime(note.closedAt)}
                      {" — "}
                    </span>
                    {note.remarks}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5 sm:max-w-xs">
            <Button
              type="button"
              className="h-14 w-full rounded-[14px] text-[17px]"
              disabled={!canSubmit || isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Close case
            </Button>
            {closeHint ? (
              <p className="text-center text-xs text-muted">{closeHint}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="lead-city">City</Label>
            <Input
              id="lead-city"
              value={city}
              maxLength={80}
              onChange={(e) => patchDraft({ city: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-location">Location</Label>
            <Input
              id="lead-location"
              value={location}
              maxLength={120}
              onChange={(e) => patchDraft({ location: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-bike">Technician</Label>
            <Select
              id="lead-bike"
              value={bikeType}
              onChange={(e) =>
                patchDraft({
                  bikeType:
                    e.target.value === "PETROL_BIKE" ||
                    e.target.value === "EV_BIKE"
                      ? e.target.value
                      : "",
                })
              }
            >
              <option value="">Not set</option>
              {BIKE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 font-mono text-[13px] text-muted">
          <span>
            Trade <b className="font-normal text-muted-2">{lead.trade ?? "—"}</b>
          </span>
          <span>
            Experience{" "}
            <b className="font-normal text-muted-2">
              {lead.extra?.Experience ??
                (lead.experienceYears != null
                  ? `${lead.experienceYears} yrs`
                  : "—")}
            </b>
          </span>
        </div>
        <LeadProfile extra={lead.extra} />
      </section>

      <section className="relative min-h-0 rounded-[22px] border border-border bg-surface">
        <div className="flex max-h-56 flex-col px-5 py-4 md:absolute md:inset-0 md:max-h-none">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full border border-border-strong bg-surface-2 font-mono text-sm font-bold text-muted">
              2
            </span>
            <h2 className="font-display text-lg font-bold">Friends</h2>
            <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-muted">
              OPTIONAL
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={openAddFriend}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {referrals.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Add a number if they know someone who would be a good fit.
            </p>
          ) : (
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto">
              {referrals.map((row, index) => (
                <li
                  key={`${row.phone}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium">
                      {formatPhoneDisplay(row.phone)}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {row.name.trim() || "Unnamed"}
                      {row.designation ? ` · ${row.designation}` : ""}
                      {row.experienceText ? ` · ${row.experienceText}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.name.trim() || "friend"}`}
                    onClick={() => openEditFriend(index)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${row.name.trim() || "friend"}`}
                    onClick={() => deleteFriend(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-border bg-surface px-5 py-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-primary-fg">
              1
            </span>
            <h2 className="font-display text-lg font-bold">How did the call go?</h2>
            {connected ? (
              <span className="ml-auto font-mono text-[11px] font-medium tracking-[0.1em] text-danger">
                REQUIRED
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setOutcome(o.value);
                  if (o.value !== CallOutcome.CONNECTED) {
                    setRating(null);
                  }
                }}
                aria-pressed={outcome === o.value}
                className={cn(
                  "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text",
                  outcome === o.value
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border-strong bg-transparent hover:bg-surface-2",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {connected ? (
            <div className="mt-3">
              <Label className="text-[13px] text-muted">Interest rating</Label>
              <div className="mt-2">
                <RatingScale value={rating} onChange={setRating} />
              </div>
            </div>
          ) : null}
        </section>

        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-border bg-surface px-5 py-4">
          <Label htmlFor="remarks" className="text-[13px] text-muted">
            Remarks {remarksRequired ? "" : "(optional)"}
          </Label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="mt-2 min-h-0 w-full flex-1 resize-none rounded-xl border border-border-strong bg-bg px-3 py-2 text-sm leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
            placeholder={
              reconnect
                ? "What should you say next time? At least 3 characters."
                : connected
                  ? "What did they say? At least 3 characters."
                  : "Optional notes about this attempt"
            }
          />
          {error ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      <FriendDialog
        key={`${friendOpen}-${friendIndex ?? "new"}`}
        open={friendOpen}
        editing={friendIndex != null}
        form={friendForm}
        onChange={setFriendForm}
        onOpenChange={setFriendOpen}
        onSave={saveFriend}
      />

      {confirmOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
          >
            <h3 className="text-base font-semibold">Close this case?</h3>
            <p className="mt-2 text-sm text-muted">
              You can&apos;t edit the rating afterwards.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Outcome: {outcomeLabel(outcome)}</li>
              {connected ? <li>Rating: {rating}</li> : null}
              <li>Friends: {referrals.filter((r) => r.phone.trim()).length}</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={isPending}
                onClick={submitClose}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Confirm close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LeadProfile({ extra }: { extra?: Record<string, string> }) {
  const rows = profileEntries(extra);
  if (rows.length === 0) return null;
  return (
    <dl className="mt-4 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-x-6 border-t border-border pt-4 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col justify-center">
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">
            {label}
          </dt>
          <dd className="mt-1 break-words text-sm text-text">
            {value.startsWith("http://") || value.startsWith("https://") ? (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-accent-text underline"
              >
                Open link
              </a>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FriendDialog({
  open,
  editing,
  form,
  onChange,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  editing: boolean;
  form: ReferralDraft;
  onChange: (next: ReferralDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const known = DESIGNATION_SUGGESTIONS.includes(
    form.designation as (typeof DESIGNATION_SUGGESTIONS)[number],
  );
  const [custom, setCustom] = useState(
    () => Boolean(form.designation) && !known,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit friend" : "Add friend"}</DialogTitle>
          <DialogDescription>
            Phone is required. Name, experience, and designation are optional.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="friend-phone">Phone</Label>
            <Input
              id="friend-phone"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) =>
                onChange({
                  ...form,
                  phone: e.target.value,
                  note: friendPhoneError(e.target.value, Boolean(form.blurred)),
                })
              }
            />
            {form.note ? (
              <p className="text-xs text-danger">{form.note}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="friend-name">Name</Label>
            <Input
              id="friend-name"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="friend-exp">Experience</Label>
            <Input
              id="friend-exp"
              value={form.experienceText}
              placeholder="e.g. 3 yrs"
              onChange={(e) =>
                onChange({ ...form, experienceText: e.target.value })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="friend-role">Designation</Label>
            <Select
              id="friend-role"
              value={custom ? "__custom__" : known ? form.designation : ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__custom__") {
                  setCustom(true);
                  onChange({ ...form, designation: "" });
                  return;
                }
                setCustom(false);
                onChange({ ...form, designation: value });
              }}
            >
              <option value="">Select…</option>
              {DESIGNATION_SUGGESTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </Select>
            {custom ? (
              <Input
                className="mt-2"
                placeholder="Or type designation"
                value={form.designation}
                onChange={(e) =>
                  onChange({ ...form, designation: e.target.value })
                }
              />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            {editing ? "Save" : "Add friend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
