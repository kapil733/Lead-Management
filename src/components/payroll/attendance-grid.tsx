"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  applyAttendanceImportAction,
  batchMarkAttendanceAction,
  deleteHolidayAction,
  lockMonthAction,
  unlockMonthAction,
  upsertHolidayAction,
} from "@/server/payroll/actions";
import type {
  AttendanceGridData,
  ImportDiffRow,
  ImportPreview,
} from "@/lib/payroll/attendance-types";
import {
  resolveDayStatus,
  sumPayable,
  type ExplicitStatus,
  type ResolvedDay,
} from "@/server/payroll/attendance/resolve";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SalaryDrawer } from "@/components/payroll/salary-drawer";
import { cn } from "@/lib/utils";

type HolidayRow = {
  id: string;
  date: string;
  name: string;
  isPaid: boolean;
};

type CellKey = string; // empId|date

const STATUS_CYCLE: Array<ExplicitStatus | null> = [
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "PAID_LEAVE",
  "WEEKLY_OFF",
  "HOLIDAY_WORKED",
  null,
];

const HOTKEY: Record<string, ExplicitStatus | null> = {
  p: "PRESENT",
  h: "HALF_DAY",
  a: "ABSENT",
  l: "PAID_LEAVE",
  w: "WEEKLY_OFF",
  delete: null,
  backspace: null,
};

const CELL_BG: Record<string, string> = {
  PRESENT: "att-present",
  HALF_DAY: "att-half",
  ABSENT: "att-absent",
  PAID_LEAVE: "att-leave",
  WEEKLY_OFF: "att-wo",
  HOLIDAY_WORKED: "att-holiday",
  HOLIDAY: "att-holiday",
  UNMARKED: "att-unmarked",
  OUT_OF_RANGE: "att-oor",
};

function cellKey(empId: string, date: string): CellKey {
  return `${empId}|${date}`;
}

function parseCellKey(k: CellKey): { empId: string; date: string } {
  const i = k.indexOf("|");
  return { empId: k.slice(0, i), date: k.slice(i + 1) };
}

type UndoEntry = {
  before: Map<CellKey, ExplicitStatus | null>;
  after: Map<CellKey, ExplicitStatus | null>;
};

export function AttendanceGrid({
  initial,
  holidays: initialHolidays,
}: {
  initial: AttendanceGridData;
  holidays: HolidayRow[];
}) {
  const router = useRouter();
  const month = initial.month;
  const [locked, setLocked] = useState(initial.locked);
  const [holidays, setHolidays] = useState(initialHolidays);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [selected, setSelected] = useState<Set<CellKey>>(new Set());
  const [anchor, setAnchor] = useState<CellKey | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ empIdx: number; dayIdx: number } | null>(null);
  const [ctx, setCtx] = useState<{
    x: number;
    y: number;
    kind: "cell" | "col" | "row";
    empId?: string;
    date?: string;
  } | null>(null);
  const [salaryEmp, setSalaryEmp] = useState<string | null>(null);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [treatAbsent, setTreatAbsent] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWrites = useRef<Map<CellKey, ExplicitStatus | null>>(new Map());

  // Explicit marks override: key -> status | null (null = cleared / no record)
  const [marks, setMarks] = useState<Map<CellKey, ExplicitStatus | null>>(
    () => {
      const m = new Map<CellKey, ExplicitStatus | null>();
      for (const emp of initial.employees) {
        for (const d of emp.days) {
          if (d.explicit) m.set(cellKey(emp.id, d.date), d.explicit);
        }
      }
      return m;
    },
  );

  const holidayMap = useMemo(() => {
    const m = new Map<string, { name: string; isPaid: boolean }>();
    for (const h of holidays) m.set(h.date, { name: h.name, isPaid: h.isPaid });
    // also from grid holidays
    for (const h of initial.holidays) {
      if (!m.has(h.date)) m.set(h.date, { name: h.name, isPaid: h.isPaid });
    }
    return m;
  }, [holidays, initial.holidays]);

  const employees = useMemo(() => {
    return initial.employees.map((emp) => {
      const days: ResolvedDay[] = emp.days.map((d) => {
        const key = cellKey(emp.id, d.date);
        const has = marks.has(key);
        const explicit = has ? marks.get(key)! : d.explicit;
        return resolveDayStatus({
          date: d.date,
          explicit: explicit ?? null,
          holiday: holidayMap.get(d.date) ?? null,
          weeklyOffDays: emp.weeklyOffDays,
          dateOfJoining: emp.dateOfJoining,
          dateOfExit: emp.dateOfExit,
        });
      });
      return {
        ...emp,
        days,
        payableDays: sumPayable(days),
      };
    });
  }, [initial.employees, marks, holidayMap]);

  const dates = initial.dates;
  const empIndex = useMemo(
    () => new Map(employees.map((e, i) => [e.id, i])),
    [employees],
  );

  const flushPending = useCallback(async () => {
    if (pendingWrites.current.size === 0) return;
    const cells = [...pendingWrites.current.entries()].map(([k, status]) => {
      const { empId, date } = parseCellKey(k);
      return { employeeId: empId, date, status };
    });
    pendingWrites.current.clear();
    setSaveState("saving");
    const result = await batchMarkAttendanceAction({ month, cells });
    if (!result.ok) {
      setSaveState("error");
      toast.error(result.error.message);
      return;
    }
    setSaveState("saved");
  }, [month]);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      void flushPending();
    }, 400);
  }, [flushPending]);

  const applyMarks = useCallback(
    (updates: Map<CellKey, ExplicitStatus | null>, recordUndo = true) => {
      if (locked) {
        toast.error("Month is locked");
        return;
      }
      setMarks((prev) => {
        if (recordUndo) {
          const before = new Map<CellKey, ExplicitStatus | null>();
          const after = new Map<CellKey, ExplicitStatus | null>();
          for (const [k, v] of updates) {
            before.set(k, prev.has(k) ? prev.get(k)! : null);
            after.set(k, v);
          }
          undoStack.current.push({ before, after });
          redoStack.current = [];
        }
        const next = new Map(prev);
        for (const [k, v] of updates) {
          if (v == null) next.delete(k);
          else next.set(k, v);
          pendingWrites.current.set(k, v);
        }
        return next;
      });
      scheduleFlush();
    },
    [locked, scheduleFlush],
  );

  const setStatusOnKeys = useCallback(
    (keys: Iterable<CellKey>, status: ExplicitStatus | null) => {
      const updates = new Map<CellKey, ExplicitStatus | null>();
      for (const k of keys) {
        const { empId, date } = parseCellKey(k);
        const emp = employees.find((e) => e.id === empId);
        const day = emp?.days.find((d) => d.date === date);
        if (!day?.editable) continue;
        updates.set(k, status);
      }
      if (updates.size) applyMarks(updates);
    },
    [employees, applyMarks],
  );

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    setMarks((prev) => {
      const next = new Map(prev);
      for (const [k, v] of entry.before) {
        if (v == null) next.delete(k);
        else next.set(k, v);
        pendingWrites.current.set(k, v);
      }
      return next;
    });
    scheduleFlush();
  }, [scheduleFlush]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    setMarks((prev) => {
      const next = new Map(prev);
      for (const [k, v] of entry.after) {
        if (v == null) next.delete(k);
        else next.set(k, v);
        pendingWrites.current.set(k, v);
      }
      return next;
    });
    scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      const k = e.key.toLowerCase();
      if (k in HOTKEY && selected.size > 0) {
        e.preventDefault();
        setStatusOnKeys(selected, HOTKEY[k]!);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, setStatusOnKeys, undo, redo]);

  useEffect(() => {
    function close() {
      setCtx(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function selectRect(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
  ): Set<CellKey> {
    const next = new Set<CellKey>();
    const rMin = Math.min(r0, r1);
    const rMax = Math.max(r0, r1);
    const cMin = Math.min(c0, c1);
    const cMax = Math.max(c0, c1);
    for (let r = rMin; r <= rMax; r++) {
      const emp = employees[r];
      if (!emp) continue;
      for (let c = cMin; c <= cMax; c++) {
        const d = emp.days[c];
        if (d?.editable) next.add(cellKey(emp.id, d.date));
      }
    }
    return next;
  }

  function onCellClick(
    e: React.MouseEvent,
    empId: string,
    date: string,
    empIdx: number,
    dayIdx: number,
  ) {
    if (locked) return;
    const key = cellKey(empId, date);
    const day = employees[empIdx]?.days[dayIdx];
    if (!day?.editable) return;

    if (e.ctrlKey || e.metaKey) {
      setStatusOnKeys([key], "PRESENT");
      setSelected(new Set([key]));
      setAnchor(key);
      return;
    }

    if (e.shiftKey && anchor) {
      const a = parseCellKey(anchor);
      const ai = empIndex.get(a.empId) ?? empIdx;
      const di = dates.indexOf(a.date);
      setSelected(selectRect(ai, di, empIdx, dayIdx));
      return;
    }

    // plain click: cycle status
    const cur = marks.get(key) ?? null;
    const idx = STATUS_CYCLE.indexOf(cur);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]!;
    setStatusOnKeys([key], next);
    setSelected(new Set([key]));
    setAnchor(key);
  }

  function onCellMouseDown(
    e: React.MouseEvent,
    empIdx: number,
    dayIdx: number,
  ) {
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || locked) return;
    dragStart.current = { empIdx, dayIdx };
    setDragging(true);
  }

  function onCellMouseEnter(empIdx: number, dayIdx: number) {
    if (!dragging || !dragStart.current) return;
    setSelected(
      selectRect(
        dragStart.current.empIdx,
        dragStart.current.dayIdx,
        empIdx,
        dayIdx,
      ),
    );
  }

  useEffect(() => {
    function up() {
      setDragging(false);
      dragStart.current = null;
    }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  function goMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    router.push(`/admin/payroll/attendance?month=${next}`);
  }

  return (
    <div className="space-y-3" data-testid="attendance-grid">
      {locked ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span>
            Month <strong>{month}</strong> is locked — attendance is read-only.
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await unlockMonthAction({ month });
                if (!res.ok) {
                  toast.error(res.error.message);
                  return;
                }
                toast.success("Month unlocked");
                setLocked(false);
                router.refresh();
              });
            }}
          >
            Unlock
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => goMonth(-1)}>
          ←
        </Button>
        <Input
          type="month"
          className="w-40"
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              router.push(`/admin/payroll/attendance?month=${e.target.value}`);
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => goMonth(1)}>
          →
        </Button>
        <span className="text-xs text-muted" data-testid="save-indicator">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "error"
              ? "Save failed"
              : "Saved"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setHolidaysOpen(true)}
          >
            Holidays
          </Button>
          <a href={`/api/admin/payroll/attendance/template?month=${month}`}>
            <Button type="button" variant="secondary" size="sm">
              Template
            </Button>
          </a>
          <label className="inline-flex cursor-pointer">
            <span className="inline-flex h-8 items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-2">
              Import Excel
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={locked}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const fd = new FormData();
                fd.set("month", month);
                fd.set("file", file);
                const res = await fetch(
                  "/api/admin/payroll/attendance/import",
                  { method: "POST", body: fd },
                );
                const json = (await res.json()) as {
                  ok: boolean;
                  data?: ImportPreview;
                  error?: { message: string };
                };
                if (!json.ok || !json.data) {
                  toast.error(json.error?.message ?? "Import failed");
                  return;
                }
                setImportPreview(json.data);
              }}
            />
          </label>
          {!locked ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setLockOpen(true)}
            >
              Lock month
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <Legend swatch="att-present" label="P Present" />
        <Legend swatch="att-half" label="½ Half" />
        <Legend swatch="att-absent" label="A Absent" />
        <Legend swatch="att-leave" label="PL Leave" />
        <Legend swatch="att-wo" label="WO Off" />
        <Legend swatch="att-holiday" label="H Holiday" />
        <span>Hotkeys: P H A L W Del · Ctrl+Z undo · Ctrl+click = Present</span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-md border">
        <table className="min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-surface">
            <tr>
              <th className="sticky left-0 z-30 min-w-[160px] border-b border-r bg-surface px-2 py-1.5 text-left font-medium">
                Employee
              </th>
              {dates.map((d, dayIdx) => {
                const wd = new Date(`${d}T00:00:00.000Z`).getUTCDay();
                const weekend = wd === 0 || wd === 6;
                const hol = holidayMap.get(d);
                return (
                  <th
                    key={d}
                    className={cn(
                      "min-w-[28px] border-b px-0.5 py-1 text-center font-medium",
                      weekend && "att-weekend",
                      hol && "att-holiday",
                    )}
                    title={hol?.name ?? d}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtx({
                        x: e.clientX,
                        y: e.clientY,
                        kind: "col",
                        date: d,
                      });
                    }}
                    data-day-idx={dayIdx}
                  >
                    {Number(d.slice(8))}
                  </th>
                );
              })}
              <th className="sticky right-0 z-30 min-w-[48px] border-b border-l bg-surface px-2 py-1.5 text-right font-medium">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={dates.length + 2}
                  className="px-3 py-10 text-center text-muted"
                >
                  No employees in range for this month
                </td>
              </tr>
            ) : (
              employees.map((emp, empIdx) => (
                <tr key={emp.id} className="border-t">
                  <td
                    className="sticky left-0 z-10 border-r bg-surface px-2 py-0.5"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtx({
                        x: e.clientX,
                        y: e.clientY,
                        kind: "row",
                        empId: emp.id,
                      });
                    }}
                  >
                    <button
                      type="button"
                      className="text-left hover:underline"
                      data-testid={`emp-name-${emp.employeeCode}`}
                      onClick={() => setSalaryEmp(emp.id)}
                    >
                      <div className="font-medium leading-tight">
                        {emp.fullName}
                      </div>
                      <div className="text-[10px] text-muted">
                        {emp.employeeCode}
                        {emp.clientName ? ` · ${emp.clientName}` : ""}
                      </div>
                    </button>
                  </td>
                  {emp.days.map((day, dayIdx) => {
                    const key = cellKey(emp.id, day.date);
                    const isSel = selected.has(key);
                    return (
                      <td
                        key={day.date}
                        data-testid={`cell-${emp.employeeCode}-${day.date}`}
                        data-effective={day.effective}
                        className={cn(
                          "h-7 select-none border-l border-black/5 text-center align-middle",
                          CELL_BG[day.effective] ?? "att-unmarked",
                          day.isWeekendColumn &&
                            day.effective === "UNMARKED" &&
                            "att-weekend",
                          isSel && "ring-2 ring-inset ring-accent-text",
                          !day.editable && "cursor-not-allowed opacity-60",
                          day.editable && !locked && "cursor-pointer",
                        )}
                        title={
                          day.holidayName
                            ? `${day.date} · ${day.holidayName}`
                            : day.date
                        }
                        onClick={(e) =>
                          onCellClick(e, emp.id, day.date, empIdx, dayIdx)
                        }
                        onMouseDown={(e) =>
                          onCellMouseDown(e, empIdx, dayIdx)
                        }
                        onMouseEnter={() => onCellMouseEnter(empIdx, dayIdx)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (!day.editable || locked) return;
                          setSelected((prev) => {
                            if (prev.has(key)) return prev;
                            return new Set([key]);
                          });
                          setCtx({
                            x: e.clientX,
                            y: e.clientY,
                            kind: "cell",
                            empId: emp.id,
                            date: day.date,
                          });
                        }}
                      >
                        {day.code}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 border-l bg-surface px-2 py-0.5 text-right tabular-nums">
                    {emp.payableDays % 1 === 0
                      ? emp.payableDays
                      : emp.payableDays.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {ctx ? (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          items={
            ctx.kind === "cell"
              ? [
                  { label: "Present (P)", onClick: () => setStatusOnKeys(selected, "PRESENT") },
                  { label: "Half day (H)", onClick: () => setStatusOnKeys(selected, "HALF_DAY") },
                  { label: "Absent (A)", onClick: () => setStatusOnKeys(selected, "ABSENT") },
                  { label: "Paid leave (L)", onClick: () => setStatusOnKeys(selected, "PAID_LEAVE") },
                  { label: "Weekly off (W)", onClick: () => setStatusOnKeys(selected, "WEEKLY_OFF") },
                  { label: "Holiday worked", onClick: () => setStatusOnKeys(selected, "HOLIDAY_WORKED") },
                  { label: "Clear", onClick: () => setStatusOnKeys(selected, null) },
                ]
              : ctx.kind === "col" && ctx.date
                ? [
                    {
                      label: "Mark column Present",
                      onClick: () => {
                        const keys = employees
                          .filter((e) =>
                            e.days.find((d) => d.date === ctx.date && d.editable),
                          )
                          .map((e) => cellKey(e.id, ctx.date!));
                        setStatusOnKeys(keys, "PRESENT");
                      },
                    },
                    {
                      label: "Mark column Absent",
                      onClick: () => {
                        const keys = employees
                          .filter((e) =>
                            e.days.find((d) => d.date === ctx.date && d.editable),
                          )
                          .map((e) => cellKey(e.id, ctx.date!));
                        setStatusOnKeys(keys, "ABSENT");
                      },
                    },
                    {
                      label: "Clear column",
                      onClick: () => {
                        const keys = employees
                          .filter((e) =>
                            e.days.find((d) => d.date === ctx.date && d.editable),
                          )
                          .map((e) => cellKey(e.id, ctx.date!));
                        setStatusOnKeys(keys, null);
                      },
                    },
                  ]
                : ctx.kind === "row" && ctx.empId
                  ? [
                      {
                        label: "Mark row Present",
                        onClick: () => {
                          const emp = employees.find((e) => e.id === ctx.empId);
                          if (!emp) return;
                          setStatusOnKeys(
                            emp.days
                              .filter((d) => d.editable)
                              .map((d) => cellKey(emp.id, d.date)),
                            "PRESENT",
                          );
                        },
                      },
                      {
                        label: "Mark row Absent",
                        onClick: () => {
                          const emp = employees.find((e) => e.id === ctx.empId);
                          if (!emp) return;
                          setStatusOnKeys(
                            emp.days
                              .filter((d) => d.editable)
                              .map((d) => cellKey(emp.id, d.date)),
                            "ABSENT",
                          );
                        },
                      },
                      {
                        label: "Clear row",
                        onClick: () => {
                          const emp = employees.find((e) => e.id === ctx.empId);
                          if (!emp) return;
                          setStatusOnKeys(
                            emp.days
                              .filter((d) => d.editable)
                              .map((d) => cellKey(emp.id, d.date)),
                            null,
                          );
                        },
                      },
                    ]
                  : []
          }
          onClose={() => setCtx(null)}
        />
      ) : null}

      <SalaryDrawer
        employeeId={salaryEmp}
        month={month}
        open={!!salaryEmp}
        onOpenChange={(v) => {
          if (!v) setSalaryEmp(null);
        }}
      />

      <Dialog open={holidaysOpen} onOpenChange={setHolidaysOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Holidays · {month.slice(0, 4)}</DialogTitle>
          </DialogHeader>
          <HolidaysMini
            year={Number(month.slice(0, 4))}
            holidays={holidays}
            onChange={(h) => setHolidays(h)}
            onRefresh={() => router.refresh()}
          />
          <DialogFooter>
            <Link href="/admin/payroll/holidays">
              <Button type="button" variant="secondary" size="sm">
                Open holidays page
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock {month}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            Locked months cannot be edited until unlocked. Payroll line
            snapshots are calculated in Phase 9.
          </p>
          {initial.unmarkedTotal > 0 ||
          employees.some((e) => e.days.some((d) => d.effective === "UNMARKED")) ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={treatAbsent}
                onChange={(e) => setTreatAbsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                Treat unmarked working days as Absent (
                {employees.reduce(
                  (a, e) =>
                    a +
                    e.days.filter((d) => d.effective === "UNMARKED").length,
                  0,
                )}{" "}
                remaining)
              </span>
            </label>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await flushPending();
                  const res = await lockMonthAction({
                    month,
                    treatUnmarkedAsAbsent: treatAbsent,
                  });
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Month locked");
                  setLockOpen(false);
                  setLocked(true);
                  router.refresh();
                });
              }}
            >
              Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!importPreview}
        onOpenChange={(v) => !v && setImportPreview(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import diff · {importPreview?.month}</DialogTitle>
          </DialogHeader>
          {importPreview ? (
            <div className="space-y-3 text-sm">
              <p>
                Set {importPreview.setCount} · Clear {importPreview.clearCount}{" "}
                · Unchanged {importPreview.unchangedCount} · Skip{" "}
                {importPreview.skipCount}
              </p>
              {importPreview.errors.length ? (
                <ul className="max-h-24 overflow-auto text-xs text-rose-700">
                  {importPreview.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}
              <div className="max-h-64 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-surface-2 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Employee</th>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Current</th>
                      <th className="px-2 py-1 text-left">Incoming</th>
                      <th className="px-2 py-1 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.diffs.slice(0, 200).map((d, i) => (
                      <tr key={`${d.employeeId}-${d.date}-${i}`} className="border-t">
                        <td className="px-2 py-1">{d.employeeCode}</td>
                        <td className="px-2 py-1">{d.date}</td>
                        <td className="px-2 py-1">{d.current || "—"}</td>
                        <td className="px-2 py-1">{d.incoming || "—"}</td>
                        <td className="px-2 py-1">{d.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setImportPreview(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    isPending ||
                    (importPreview.setCount === 0 &&
                      importPreview.clearCount === 0)
                  }
                  onClick={() => {
                    const diffs = importPreview.diffs as ImportDiffRow[];
                    startTransition(async () => {
                      const res = await applyAttendanceImportAction({
                        month: importPreview.month,
                        diffs,
                      });
                      if (!res.ok) {
                        toast.error(res.error.message);
                        return;
                      }
                      toast.success(
                        `Applied ${res.data.written} set / ${res.data.cleared} clear`,
                      );
                      setImportPreview(null);
                      router.refresh();
                    });
                  }}
                >
                  Apply changes
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-block h-3 w-3 rounded-sm", swatch)} />
      {label}
    </span>
  );
}

function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: { label: string; onClick: () => void }[];
  onClose: () => void;
}) {
  return (
    <div
      role="menu"
      data-testid="attendance-context-menu"
      className="fixed z-50 min-w-[180px] rounded-md border bg-surface py-1 shadow-md"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2"
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function HolidaysMini({
  year,
  holidays,
  onChange,
  onRefresh,
}: {
  year: number;
  holidays: HolidayRow[];
  onChange: (h: HolidayRow[]) => void;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [date, setDate] = useState(`${year}-01-01`);
  const [isPaid, setIsPaid] = useState(true);

  return (
    <div className="space-y-3">
      <ul className="max-h-40 space-y-1 overflow-auto text-sm">
        {holidays.map((h) => (
          <li
            key={h.id}
            className="flex items-center justify-between gap-2 border-b py-1"
          >
            <span>
              <span className="tabular-nums">{h.date}</span> · {h.name}{" "}
              <span className="text-muted">
                ({h.isPaid ? "paid" : "unpaid"})
              </span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteHolidayAction({ id: h.id });
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  onChange(holidays.filter((x) => x.id !== h.id));
                  onRefresh();
                });
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPaid}
          onChange={(e) => setIsPaid(e.target.checked)}
        />
        Paid
      </label>
      <Button
        type="button"
        size="sm"
        disabled={isPending || !name.trim()}
        onClick={() => {
          startTransition(async () => {
            const res = await upsertHolidayAction({ date, name, isPaid });
            if (!res.ok) {
              toast.error(res.error.message);
              return;
            }
            toast.success("Holiday saved");
            setName("");
            onRefresh();
          });
        }}
      >
        Add / update
      </Button>
    </div>
  );
}
