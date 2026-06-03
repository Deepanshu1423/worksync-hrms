"use client";

import { ReactNode, useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("worksync_theme") as ThemeMode | null;

    const theme: ThemeMode = savedTheme || "dark";

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("worksync_theme", theme);

    setIsMounted(true);
  }, []);

  /**
   * Keep first render stable.
   * This helps avoid hydration mismatch.
   */
  if (!isMounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}