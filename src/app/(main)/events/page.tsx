import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { EVENT_TYPES, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Plus, Calendar, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getSession();
  const profileId = session?.profileId ?? "";

  const events = await prisma.event.findMany({
    where: { profileId },
    include: { products: true, campaigns: true },
    orderBy: { startAt: "asc" },
  });

  const typeLabel = (t: string) =>
    EVENT_TYPES.find((e) => e.value === t)?.label ?? t;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight">
            Événements
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {events.length} événement{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvel événement
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
          <Calendar className="mx-auto h-10 w-10 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">Aucun événement</p>
          <Link
            href="/events/new"
            className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            <Plus className="h-3 w-3" />
            Créer un événement
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl hover:border-gray-300 transition-colors p-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="font-medium text-gray-900 text-sm">
                    {event.name}
                  </p>
                  <Badge status={event.status} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(event.startAt)}
                    {event.endAt ? ` → ${formatDateTime(event.endAt)}` : ""}
                  </span>
                  {(event.location || event.venue) && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[event.location, event.venue].filter(Boolean).join(" — ")}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                    {typeLabel(event.type)}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 ml-4 shrink-0 text-xs text-gray-400">
                <span>{event.products.length} produit(s)</span>
                <span>{event.campaigns.length} campagne(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
