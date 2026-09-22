"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export function BulkSearchRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  useEffect(() => {
    if (!active) return;
    const refresh = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(refresh);
  }, [active, router]);

  return (
    <button
      type="button"
      className="bulk-search-refresh"
      onClick={() => startTransition(() => router.refresh())}
      disabled={refreshing}
      aria-label="Refresh bulk SKU search progress"
    >
      {refreshing ? "Refreshing…" : "Refresh table"}
    </button>
  );
}
