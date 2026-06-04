"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ResponsivePageAction = {
  label: string;
  icon: ElementType;
  onClick: () => void;
  variant?: "primary" | "normal" | "danger";
  disabled?: boolean;
};

type ResponsivePageActionsProps = {
  actions: ResponsivePageAction[];
};

type MenuPosition = {
  top: number;
  right: number;
};

export default function ResponsivePageActions({
  actions,
}: ResponsivePageActionsProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 80,
    right: 16,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    setMenuPosition({
      top: rect.bottom + 10,
      right: Math.max(16, window.innerWidth - rect.right),
    });
  };

  const handleToggleMenu = () => {
    updateMenuPosition();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updateMenuPosition();
    };

    const handleScroll = () => {
      updateMenuPosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const getDesktopButtonClass = (variant?: ResponsivePageAction["variant"]) => {
    if (variant === "primary") {
      return "h-11 rounded-xl bg-amber-400 px-5 font-black text-black hover:bg-amber-300";
    }

    if (variant === "danger") {
      return "h-11 rounded-xl border-red-300/20 bg-red-300/10 px-5 font-bold text-red-100 hover:bg-red-300/20";
    }

    return "h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10";
  };

  const getMobileButtonClass = (variant?: ResponsivePageAction["variant"]) => {
    if (variant === "primary") {
      return "border-amber-300 bg-amber-400 text-black hover:bg-amber-300";
    }

    if (variant === "danger") {
      return "border-red-300/20 bg-red-300/10 text-red-100 hover:bg-red-300/20";
    }

    return "border-white/10 bg-white/5 text-white hover:bg-white/10";
  };

  const mobileMenu = isMounted && isOpen
    ? createPortal(
        <>
          {/* Mobile backdrop */}
          <button
            type="button"
            aria-label="Close page actions"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[9998] bg-black/20 sm:hidden"
          />

          {/* Mobile dropdown */}
          <div
            className="fixed z-[9999] w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-amber-200/20 bg-[#17100b] p-3 text-white shadow-2xl shadow-black/50 sm:hidden"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
            }}
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-xs font-black uppercase tracking-wide text-amber-200/70">
                Page Actions
              </p>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2">
              {actions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      setIsOpen(false);
                      action.onClick();
                    }}
                    className={`flex h-11 items-center rounded-2xl border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${getMobileButtonClass(
                      action.variant
                    )}`}
                  >
                    <Icon className="mr-3 h-4 w-4 shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
      {/* Desktop / tablet buttons */}
      <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-end">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              variant={action.variant === "primary" ? "default" : "outline"}
              className={getDesktopButtonClass(action.variant)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Mobile hamburger button */}
      <div className="flex justify-end sm:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggleMenu}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400 text-black shadow-xl shadow-black/25"
          aria-label="Open page actions"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenu}
    </>
  );
}