import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "PSL — Product & Event Management",
  description: "Gestion des produits et événements mode",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-8 max-w-6xl mx-auto">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
