"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Calendar,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Événements", href: "/events", icon: Calendar },
  { name: "Campagnes", href: "/campaigns", icon: Megaphone },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r" style={{ backgroundColor: '#F5F5F7', borderColor: 'rgba(0,0,0,0.08)' }}>
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: '#1D1D1F' }}
          >
            <span className="text-white text-[10px]" style={{ fontWeight: 500, letterSpacing: '0.05em' }}>P</span>
          </div>
          <span style={{ color: '#1D1D1F', fontSize: '13px', fontWeight: 400, letterSpacing: '-0.01em' }}>
            PSL Studio
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 space-y-0.5">
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
                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all",
                isActive
                  ? "bg-white/80"
                  : "hover:bg-black/[0.04]"
              )}
              style={{
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <item.icon
                className="h-[15px] w-[15px] flex-shrink-0"
                style={{ color: isActive ? '#1D1D1F' : '#86868B' }}
                strokeWidth={isActive ? 1.75 : 1.5}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: isActive ? 400 : 300,
                  color: isActive ? '#1D1D1F' : '#6E6E73',
                  letterSpacing: '-0.01em',
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5">
        <p style={{ fontSize: '11px', color: '#C7C7CC', fontWeight: 300 }}>v1.0</p>
      </div>
    </aside>
  );
}
