"use client";

import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import { useTransition, useCallback } from "react";

/** Shared cross-filter setters for chart click → URL. */
export function useAnalyticsCrossFilter() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useQueryStates(
    {
      employeeId: parseAsString,
      outcome: parseAsString,
      rating: parseAsInteger,
      hour: parseAsInteger,
      dow: parseAsInteger,
      from: parseAsString,
      to: parseAsString,
      tab: parseAsString,
      page: parseAsInteger.withDefault(1),
    },
    { shallow: false, startTransition },
  );

  const toggleOutcome = useCallback(
    (outcome: string) => {
      void setState({
        outcome: state.outcome === outcome ? null : outcome,
        page: 1,
      });
    },
    [setState, state.outcome],
  );

  const toggleRating = useCallback(
    (rating: number) => {
      void setState({
        rating: state.rating === rating ? null : rating,
        page: 1,
      });
    },
    [setState, state.rating],
  );

  const toggleEmployee = useCallback(
    (employeeId: string) => {
      void setState({
        employeeId: state.employeeId === employeeId ? null : employeeId,
        page: 1,
      });
    },
    [setState, state.employeeId],
  );

  const toggleHour = useCallback(
    (hour: number) => {
      void setState({
        hour: state.hour === hour ? null : hour,
        page: 1,
      });
    },
    [setState, state.hour],
  );

  const toggleDow = useCallback(
    (dow: number) => {
      void setState({
        dow: state.dow === dow ? null : dow,
        page: 1,
      });
    },
    [setState, state.dow],
  );

  const drillDay = useCallback(
    (date: string) => {
      void setState({
        from: date,
        to: date,
        tab: "data",
        page: 1,
      });
    },
    [setState],
  );

  const exportCsv = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const a = document.createElement("a");
    a.href = `/api/admin/analytics/export?${params.toString()}`;
    a.download = "analytics-cases.csv";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  return {
    isPending,
    toggleOutcome,
    toggleRating,
    toggleEmployee,
    toggleHour,
    toggleDow,
    drillDay,
    exportCsv,
    setState,
  };
}
