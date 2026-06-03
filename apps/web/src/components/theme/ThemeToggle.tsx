"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "dark" | "light";

export default function ThemeToggle() {
  const pathname = usePathname();

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const currentTheme =
      (localStorage.getItem("worksync_theme") as ThemeMode | null) || "dark";

    setTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
    setIsMounted(true);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("worksync_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  if (!isMounted) return null;

  const isLoginPage = pathname === "/login";

  return (
    <button
      type="button"
      onClick={handleToggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "fixed right-5 z-[9999] flex h-12 w-12 items-center justify-center rounded-2xl",
        "border border-amber-300/30 bg-amber-400 text-black",
        "shadow-2xl shadow-black/30 transition hover:scale-105 hover:bg-amber-300",
        isLoginPage ? "top-5" : "top-24",
      ].join(" ")}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}