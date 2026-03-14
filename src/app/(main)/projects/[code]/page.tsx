"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  Check,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MessageSquare,
  UserPlus,
  X,
  Send,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  sku: string;
  family: string;
  season: string;
  year: number;
  sizeRange: string;
  measurements: string | null;
  sketchPaths: string[];
  addedAt: string;
};

type Contribution = {
  id: string;
  createdAt: string;
  productId: string;
  photoPaths: string | null;
  note: string | null;
  profile: { id: string; name: string };
};

type Collaborator = {
  profileId: string;
  joinedAt: string;
  profile: { id: string; name: string; email: string };
};

type ProjectData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  profileId: string;
  isOwner: boolean;
  products: Product[];
  collaborators: Collaborator[];
  contributions: Contribution[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePhotoPaths(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Expanded product accordion
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Contribution form per product
  const [activeContrib, setActiveContrib] = useState<string | null>(null);
  const [contribNote, setContribNote] = useState("");
  const [contribFiles, setContribFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete project modal
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Invite collaborator modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // ─── Load data ──────────────────────────────────────────────────────────────

  async function load() {
    const res = await fetch(`/api/projects/${code}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Projet introuvable.");
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Copy code ──────────────────────────────────────────────────────────────

  function handleCopyCode() {
    if (!data) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Submit contribution ─────────────────────────────────────────────────────

  async function handleContribute(productId: string) {
    if (contribFiles.length === 0 && !contribNote.trim()) {
      setSubmitError("Ajoutez au moins une photo ou une note.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    let res: Response;

    if (contribFiles.length > 0) {
      const fd = new FormData();
      contribFiles.forEach((f) => fd.append("files", f));
      if (contribNote.trim()) fd.append("note", contribNote.trim());
      res = await fetch(`/api/projects/${code}/products/${productId}/contributions`, {
        method: "POST",
        body: fd,
      });
    } else {
      res = await fetch(`/api/projects/${code}/products/${productId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: contribNote.trim() }),
      });
    }

    if (res.ok) {
      setContribNote("");
      setContribFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveContrib(null);
      await load();
    } else {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? "Erreur lors de l'envoi.");
    }
    setSubmitting(false);
  }

  // ─── Remove product (owner) ──────────────────────────────────────────────────

  async function handleRemoveProduct(productId: string) {
    await fetch(`/api/projects/${code}/products/${productId}`, { method: "DELETE" });
    await load();
  }

  // ─── Delete project (owner) ──────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/projects/${code}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/projects");
    } else {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // ─── Invite collaborator ─────────────────────────────────────────────────────

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    const res = await fetch(`/api/projects/${code}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    if (res.ok) {
      setInviteSuccess(true);
      setInviteEmail("");
    } else {
      const body = await res.json().catch(() => ({}));
      setInviteError(body.error ?? "Erreur lors de l'envoi.");
    }
    setInviting(false);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400 text-sm">
        Chargement…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-red-600 text-sm">{error ?? "Projet introuvable."}</p>
      </div>
    );
  }

  const { products, collaborators, contributions, isOwner } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight">
              {data.name}
            </h1>
            {!isOwner && (
              <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
                Collaborateur
              </span>
            )}
          </div>
          {data.description && (
            <p className="text-sm text-gray-500">{data.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">Code projet :</span>
            <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              {data.code}
            </code>
            <button
              onClick={handleCopyCode}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              title="Copier le code"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowInvite(true);
                setInviteSuccess(false);
                setInviteError(null);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 border border-indigo-200 px-3 py-1.5 rounded-lg"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Inviter un collaborateur
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm text-gray-500">
        <span>
          <strong className="text-gray-900">{products.length}</strong> produit(s)
        </span>
        <span>
          <strong className="text-gray-900">{collaborators.length}</strong> collaborateur(s)
        </span>
        <span>
          <strong className="text-gray-900">{contributions.length}</strong> contribution(s)
        </span>
      </div>

      {/* Collaborators (owner only) */}
      {isOwner && collaborators.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Collaborateurs
          </h2>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((c) => (
              <div
                key={c.profileId}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1"
              >
                <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                  {c.profile.name[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-medium text-gray-700">{c.profile.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Produits du projet
          </h2>
          {isOwner && (
            <Link
              href={`/projects/${code}/add-products`}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Ajouter des produits
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-400 text-sm">Aucun produit dans ce projet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const productContribs = contributions.filter(
                (c) => c.productId === product.id
              );
              const isExpanded = expandedProduct === product.id;
              const isContribOpen = activeContrib === product.id;

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                >
                  {/* Product header */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button
                      onClick={() =>
                        setExpandedProduct(isExpanded ? null : product.id)
                      }
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {product.sku} · {product.season} {product.year} · {product.sizeRange}
                        </p>
                      </div>
                      {productContribs.length > 0 && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
                          {productContribs.length} contribution(s)
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveContrib(isContribOpen ? null : product.id);
                          setSubmitError(null);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Contribuer
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          title="Retirer du projet"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contribution form */}
                  {isContribOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                      <p className="text-xs font-medium text-gray-600">
                        Ajouter une contribution
                      </p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Photos (optionnel)
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(e) =>
                            setContribFiles(Array.from(e.target.files ?? []))
                          }
                          className="text-xs text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Note
                        </label>
                        <textarea
                          value={contribNote}
                          onChange={(e) => setContribNote(e.target.value)}
                          rows={3}
                          maxLength={5000}
                          placeholder="Commentaire, observation, retour…"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                        />
                      </div>
                      {submitError && (
                        <p className="text-xs text-red-600">{submitError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleContribute(product.id)}
                          disabled={submitting}
                          className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
                        >
                          {submitting ? "Envoi…" : "Envoyer"}
                        </button>
                        <button
                          onClick={() => {
                            setActiveContrib(null);
                            setContribNote("");
                            setContribFiles([]);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded: sketches + contributions */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                      {/* Sketches */}
                      {product.sketchPaths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <ImageIcon className="h-3.5 w-3.5" />
                            Croquis
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {product.sketchPaths.map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={src}
                                alt={`Croquis ${i + 1}`}
                                className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Measurements */}
                      {product.measurements && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Notes techniques
                          </p>
                          <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans">
                            {product.measurements}
                          </pre>
                        </div>
                      )}

                      {/* Contributions for this product */}
                      {productContribs.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Contributions ({productContribs.length})
                          </p>
                          <div className="space-y-3">
                            {productContribs.map((c) => (
                              <div
                                key={c.id}
                                className="bg-gray-50 rounded-xl px-4 py-3 space-y-2"
                              >
                                <p className="text-xs text-gray-400">
                                  <strong className="text-gray-700">
                                    {c.profile.name}
                                  </strong>{" "}
                                  ·{" "}
                                  {new Date(c.createdAt).toLocaleDateString(
                                    "fr-FR"
                                  )}
                                </p>
                                {c.note && (
                                  <p className="text-sm text-gray-700">{c.note}</p>
                                )}
                                {parsePhotoPaths(c.photoPaths).length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {parsePhotoPaths(c.photoPaths).map(
                                      (src, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          key={i}
                                          src={src}
                                          alt={`Contribution photo ${i + 1}`}
                                          className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                        />
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {productContribs.length === 0 &&
                        product.sketchPaths.length === 0 &&
                        !product.measurements && (
                          <p className="text-xs text-gray-400">
                            Aucun contenu pour l&apos;instant.
                          </p>
                        )}

                      {/* Link to full product (owner only) */}
                      {isOwner && (
                        <Link
                          href={`/products/${product.id}`}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Voir le produit complet →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invite collaborator modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Inviter un collaborateur
              </h2>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteEmail("");
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <Check className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-700">
                  Invitation envoyée ! La personne recevra une notification
                  à la prochaine connexion.
                </p>
                <button
                  onClick={() => {
                    setInviteSuccess(false);
                    setInviteError(null);
                  }}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Inviter une autre personne
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Entrez l&apos;adresse email du collaborateur à inviter sur{" "}
                  <strong className="text-gray-800">{data.name}</strong>.
                </p>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  placeholder="email@exemple.com"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
                  autoFocus
                />
                {inviteError && (
                  <p className="text-xs text-red-600 mb-3">{inviteError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {inviting ? "Envoi…" : "Envoyer l'invitation"}
                  </button>
                  <button
                    onClick={() => {
                      setShowInvite(false);
                      setInviteEmail("");
                      setInviteError(null);
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer le projet ?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Toutes les contributions seront supprimées. Cette action est
              irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
