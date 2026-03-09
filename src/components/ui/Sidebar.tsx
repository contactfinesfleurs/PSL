"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Calendar,
  Megaphone,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    label: "GÉNÉRAL",
    items: [
      { name: "Vue d'ensemble", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "CATALOGUE",
    items: [
      { name: "Produits", href: "/products", icon: Package },
      { name: "Look Book", href: "/lookbook", icon: BookOpen },
      { name: "Événements", href: "/events", icon: Calendar },
      { name: "Campagnes", href: "/campaigns", icon: Megaphone },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[210px] shrink-0 bg-white flex flex-col border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <rect width="32" height="32" rx="6" fill="#1B3A6B"/>
          <text x="16" y="22" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="white" stroke="white" strokeWidth="0.3">PSL</text>
        </svg>
        <span className="font-semibold text-gray-900 text-[14px] tracking-tight">
          PSL Studio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold text-gray-400 tracking-widest uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-indigo-600" : "text-gray-400"
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400">PSL Studio v1.0</p>
      </div>
    </aside>
  );
}
