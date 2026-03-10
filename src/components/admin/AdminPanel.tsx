"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfilesTab } from "./ProfilesTab";
import { TeamsTab } from "./TeamsTab";

type Tab = "profiles" | "teams";

type Props = {
  actingRole: string;
  actingTeamId: string | null;
};

export function AdminPanel({ actingRole, actingTeamId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("profiles");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-4xl font-light text-gray-900 tracking-tight">Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {actingRole === "SUPER_ADMIN" ? "Super-administrateur" : "Administrateur"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("profiles")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            activeTab === "profiles"
              ? "bg-gray-900 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          Profils
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            activeTab === "teams"
              ? "bg-gray-900 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          Équipes
        </button>
      </div>

      {activeTab === "profiles" && (
        <ProfilesTab actingRole={actingRole} actingTeamId={actingTeamId} />
      )}
      {activeTab === "teams" && (
        <TeamsTab actingRole={actingRole} />
      )}
    </div>
  );
}
