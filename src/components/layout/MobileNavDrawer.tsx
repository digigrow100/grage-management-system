"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, X } from "lucide-react";
import { usePermission } from "./PermissionContext";
import { cn } from "@/lib/cn";
import { groupedNavItems } from "@/lib/nav-items";
import { useNavDrawer } from "./NavDrawerContext";

export function MobileNavDrawer() {
  const { isOpen, close } = useNavDrawer();
  const pathname = usePathname();
  const can = usePermission();
  const groups = groupedNavItems(can);

  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm animate-[modal-fade_180ms_ease-out]"
        onClick={close}
      />
      <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-brand-950 animate-[drawer-in_200ms_ease-out]">
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white shadow-sm shadow-accent-600/40">
              <Car size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">My Garage CRM</p>
              <p className="text-xs text-slate-400">Workshop console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {groups.map((group, idx) => (
            <div key={group.section ?? `group-${idx}`} className="space-y-1">
              {group.section ? (
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.section}
                </p>
              ) : null}
              {group.items.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent-600 text-white shadow-sm shadow-accent-600/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-slate-500">
            Your garage workspace
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
