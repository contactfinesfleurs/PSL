import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "PSL Studio",
  description: "Gestion des produits et événements mode",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div style={{ display: "flex", height: "100vh", backgroundColor: "#F5F5F7", overflow: "hidden" }}>
          <Sidebar />
          <main style={{ flex: 1, overflowY: "auto", padding: "52px 64px 64px" }}>
            <div style={{ maxWidth: "880px", margin: "0 auto" }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
