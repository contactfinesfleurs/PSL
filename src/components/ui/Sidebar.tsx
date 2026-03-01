"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Calendar, Megaphone } from "lucide-react";

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
      { name: "Produits",   href: "/products",  icon: Package },
      { name: "Événements", href: "/events",    icon: Calendar },
      { name: "Campagnes",  href: "/campaigns", icon: Megaphone },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "200px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(248,248,250,0.95)",
        backdropFilter: "saturate(180%) blur(20px)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        userSelect: "none",
      }}
    >
      {/* App name */}
      <div style={{ padding: "20px 16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "5px",
              backgroundColor: "#1D1D1F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontSize: "9px", fontWeight: 600, letterSpacing: "0.02em" }}>P</span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.02em" }}>
            PSL Studio
          </span>
        </div>
      </div>

      {/* Navigation sections */}
      <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {sections.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "#8E8E93",
                letterSpacing: "0.06em",
                padding: "0 8px",
                marginBottom: "4px",
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    backgroundColor: isActive ? "rgba(0,113,227,0.1)" : "transparent",
                    transition: "background-color 0.1s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <item.icon
                    strokeWidth={isActive ? 1.75 : 1.5}
                    style={{
                      width: "14px",
                      height: "14px",
                      color: isActive ? "#0071E3" : "#8E8E93",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12.5px",
                      fontWeight: isActive ? 500 : 300,
                      color: isActive ? "#0071E3" : "#3A3A3C",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Version */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <span style={{ fontSize: "10px", color: "#C7C7CC", fontWeight: 300, letterSpacing: "0.01em" }}>
          PSL Studio v1.0
        </span>
      </div>
    </aside>
  );
}
