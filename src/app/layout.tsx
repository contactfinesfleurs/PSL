import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import { MobileHeader } from "@/components/ui/MobileHeader";
import { getSession } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PSL — Product & Event Management",
  description: "Gestion des produits et événements mode",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const userRole = session?.role ?? null;

  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans bg-[#f4f4f6]">
        {session && (
          <MobileHeader userName={session.name} userEmail={session.email} userRole={userRole} />
        )}
        <div className="md:flex md:h-screen">
          {session && (
            <Sidebar userName={session.name} userEmail={session.email} userRole={userRole} plan={session.plan} />
          )}
          <main className={`flex-1 overflow-auto${session ? " pt-14 md:pt-0" : ""}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
