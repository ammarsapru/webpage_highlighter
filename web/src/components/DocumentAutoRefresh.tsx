"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Polls the current page every few seconds while a document is still generating. */
export default function DocumentAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
