"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Calendar,
  Megaphone,
  BookOpen,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarProps = {
  userName: string;
  userEmail: string;
  userRole: string | null;
};

export function Sidebar({ userName, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

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
    ...(isAdmin
      ? [{
          label: "ADMINISTRATION",
          items: [
            { name: "Administration", href: "/admin", icon: ShieldCheck },
          ],
        }]
      : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-[#0f1f3d]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.12]">
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="10" y="11" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="10" fill="white">PSL</text>
          </svg>
        </div>
        <span className="font-semibold text-white text-[14px] tracking-tight">
          PSL Studio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-white/35">
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-white/[0.12] text-white"
                        : "text-white/55 hover:text-white"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-white/90" : "text-white/40"
                      )}
                    />
                    {item.name}
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.07]">
          <div className="h-7 w-7 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 bg-white/15 text-white">
            {initials || <User className="h-3.5 w-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate text-white/90">
              {userName}
            </p>
            <p className="text-[10px] truncate text-white/40">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="text-white/40 hover:text-white/90 transition-colors shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
