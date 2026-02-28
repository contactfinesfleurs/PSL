import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPES, formatDate } from "@/lib/utils";
import { Plus, Calendar } from "lucide-react";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    include: { products: true, campaigns: true },
    orderBy: { startAt: "asc" },
  });

  const typeLabel = (t: string) =>
    EVENT_TYPES.find((e) => e.value === t)?.label ?? t;

  const statusStyle: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    CONFIRMED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  const statusLabel: Record<string, string> = {
    DRAFT: "Brouillon",
    CONFIRMED: "Confirmé",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Événements</h1>
          <p className="text-sm text-gray-500 mt-1">
            {events.length} événement{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvel événement
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
          <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aucun événement</p>
          <Link
            href="/events/new"
            className="mt-4 inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
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
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{event.name}</p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[event.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusLabel[event.status] ?? event.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    {formatDate(event.startAt)}
                    {event.endAt ? ` → ${formatDate(event.endAt)}` : ""}
                  </span>
                  {event.location && (
                    <span className="text-xs text-gray-500">
                      · {event.location}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {typeLabel(event.type)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-4 shrink-0 text-xs text-gray-500">
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
