"use client";

import { useEffect } from "react";

export function useAutoRefresh(callback: () => void, intervalMs: number = 30000) {
  useEffect(() => {
    const timer = setInterval(() => {
      callback();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [callback, intervalMs]);
}