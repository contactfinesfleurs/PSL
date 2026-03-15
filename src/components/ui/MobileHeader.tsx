"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Calendar,
  Megaphone,
  BookOpen,
  LogOut,
  User,
  ShieldCheck,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  userName: string;
  userEmail: string;
  userRole: string | null;
};

export function MobileHeader({ userName, userEmail, userRole }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const sections = [
    {
      label: "GÉNÉRAL",
      items: [{ name: "Vue d'ensemble", href: "/", icon: LayoutDashboard }],
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
    {
      label: "COLLABORATION",
      items: [{ name: "Projets", href: "/projects", icon: FolderKanban }],
    },
    ...(isAdmin
      ? [
          {
            label: "ADMINISTRATION",
            items: [{ name: "Administration", href: "/admin", icon: ShieldCheck }],
          },
        ]
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
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="32" height="32" rx="6" fill="#1B3A6B" />
            <text x="16" y="22" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="white" stroke="white" strokeWidth="0.3">PSL</text>
          </svg>
          <span className="font-semibold text-gray-900 text-[14px] tracking-tight">
            PSL Studio
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col shadow-xl transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect width="32" height="32" rx="6" fill="#1B3A6B" />
              <text x="16" y="22" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="white" stroke="white" strokeWidth="0.3">PSL</text>
            </svg>
            <span className="font-semibold text-gray-900 text-[14px] tracking-tight">
              PSL Studio
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
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
                        "flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
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

        {/* User info + logout */}
        <div className="px-3 py-3 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0">
              {initials || <User className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
