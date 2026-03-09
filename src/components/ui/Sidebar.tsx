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

const navigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Look Book", href: "/lookbook", icon: BookOpen },
  { name: "Événements", href: "/events", icon: Calendar },
  { name: "Campagnes", href: "/campaigns", icon: Megaphone },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-[#0f0f16] flex flex-col border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-white/5">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="font-semibold text-white text-[15px] tracking-tight">
          PSL Studio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-purple-500/15 text-purple-300"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-purple-400" : "text-gray-600"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5">
        <p className="text-xs text-gray-700">PSL Studio v1.0</p>
      </div>
    </aside>
  );
}
