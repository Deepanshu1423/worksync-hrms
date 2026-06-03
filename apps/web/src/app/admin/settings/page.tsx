"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Database,
  MapPin,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const settingCards = [
  {
    title: "Departments",
    description:
      "Manage solar company departments like O&M, HR, Finance, Procurement and Plant Operations.",
    href: "/admin/settings/departments",
    icon: Building2,
    status: "Ready",
  },
  {
    title: "Designations",
    description:
      "Manage employee designations like O&M Engineer, Site Supervisor, HR Executive and Manager.",
    href: "/admin/settings/designations",
    icon: BadgeCheck,
    status: "Ready",
  },
  {
    title: "Office Locations",
    description:
      "Manage office/site geo locations used as attendance reference locations.",
    href: "/admin/settings/office-locations",
    icon: MapPin,
    status: "Ready",
  },
  {
    title: "Roles",
    description:
      "View system roles like Admin, Manager and Employee used for access control.",
    href: "/admin/settings/roles",
    icon: ShieldCheck,
    status: "Ready",
  },
];

/**
 * Duplicate-safe settings cards.
 *
 * Even though this page is static, this keeps the rendering safe
 * if a card is accidentally added twice in the array.
 */
const uniqueSettingCards = Array.from(
  new Map(settingCards.map((item) => [item.href, item])).values()
);

export default function SettingsPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* Premium hero */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-amber-200/30 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
              <Sparkles className="h-4 w-4" />
              Admin Settings
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Master Data Management
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Manage HRMS master data used across employee management,
              attendance, projects, tasks, reports and role-based access
              control.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
            <div className="rounded-3xl border border-amber-100/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                <Database className="h-5 w-5" />
              </div>
              <p className="text-sm text-white/50">Master Modules</p>
              <p className="mt-1 text-3xl font-black text-white">
                {uniqueSettingCards.length}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-100/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm text-white/50">Status</p>
              <p className="mt-1 text-3xl font-black text-white">Ready</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {uniqueSettingCards.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <Link href={item.href} className="block h-full">
                <Card className="group h-full overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/30 hover:bg-[#21160e]/80">
                  <CardContent className="relative flex h-full items-start gap-4 p-5 sm:p-6">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-amber-300/10 blur-3xl transition group-hover:bg-amber-300/20" />

                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="relative min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-xl font-black text-white">
                          {item.title}
                        </h2>

                        <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-white/55">
                        {item.description}
                      </p>

                      <div className="mt-5 flex items-center text-sm font-bold text-amber-300">
                        Open Module
                        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Note */}
      <Card className="border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <Settings className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                Master Data Control
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                These settings are used across employees, attendance, tasks,
                projects and reports. Keep names clean and avoid duplicate
                master records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}