"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShareData = {
  share: {
    id: string;
    code: string;
    label: string | null;
    expiresAt: string | null;
  };
  product: {
    id: string;
    name: string;
    sku: string;
    reference: string | null;
    family: string;
    season: string;
    year: number;
    sizeRange: string;
    measurements: string | null;
    sketchPaths: string[];
  };
  contributions: {
    id: string;
    createdAt: string;
    authorName: string | null;
    photoPaths: string[];
    note: string | null;
  }[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SharePage() {
  const { code } = useParams<{ code: string }>();

  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [authorName, setAuthorName] = useState("");
  const [note, setNote] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load share data ───────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/share/${code}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Lien de partage invalide.");
        }
        return res.json() as Promise<ShareData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  // ─── Submit contribution ───────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0 && note.trim() === "") {
      setSubmitError("Ajoutez au moins une photo ou une note.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append("files", f));
        if (authorName.trim()) formData.append("authorName", authorName.trim());
        if (note.trim()) formData.append("note", note.trim());

        const res = await fetch(`/api/share/${code}/photos`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erreur lors de l'envoi.");
        }
      } else {
        const res = await fetch(`/api/share/${code}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: note.trim(),
            authorName: authorName.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erreur lors de l'envoi.");
        }
      }

      // Reset form and reload
      setNote("");
      setAuthorName("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSubmitSuccess(true);

      // Reload contributions
      const res = await fetch(`/api/share/${code}`);
      if (res.ok) setData(await res.json());
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.centered}>
        <p style={styles.muted}>Chargement…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.centered}>
        <p style={styles.errorText}>{error ?? "Lien de partage invalide."}</p>
      </div>
    );
  }

  const { share, product, contributions } = data;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <p style={styles.badge}>Partage PSL</p>
        <h1 style={styles.productName}>{product.name}</h1>
        {share.label && <p style={styles.shareLabel}>{share.label}</p>}
        <p style={styles.metaLine}>
          {product.sku} · {product.family} · {product.season} {product.year}
          {product.reference ? ` · Réf. ${product.reference}` : ""}
        </p>
        {product.sizeRange && (
          <p style={styles.metaLine}>Tailles : {product.sizeRange}</p>
        )}
        {share.expiresAt && (
          <p style={styles.expiry}>
            Lien valide jusqu&apos;au{" "}
            {new Date(share.expiresAt).toLocaleDateString("fr-FR")}
          </p>
        )}
      </div>

      {/* Sketches */}
      {product.sketchPaths.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Croquis</h2>
          <div style={styles.imageGrid}>
            {product.sketchPaths.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Croquis ${i + 1}`} style={styles.image} />
            ))}
          </div>
        </section>
      )}

      {/* Measurements */}
      {product.measurements && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Mensurations / Notes techniques</h2>
          <pre style={styles.pre}>{product.measurements}</pre>
        </section>
      )}

      {/* Contributions */}
      {contributions.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Contributions ({contributions.length})
          </h2>
          <div style={styles.contributionList}>
            {contributions.map((c) => (
              <div key={c.id} style={styles.contribution}>
                <p style={styles.contributionMeta}>
                  <strong>{c.authorName ?? "Anonyme"}</strong>
                  {" · "}
                  {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                </p>
                {/* c.note is rendered as a React text node — XSS-safe, no escaping needed */}
                {c.note && <p style={styles.contributionNote}>{c.note}</p>}
                {c.photoPaths.length > 0 && (
                  <div style={styles.imageGrid}>
                    {c.photoPaths.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt={`Photo contribution ${i + 1}`}
                        style={styles.image}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add contribution form */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Ajouter une contribution</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Votre nom (optionnel)
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={200}
              style={styles.input}
              placeholder="ex. Marie Dupont"
            />
          </label>

          <label style={styles.label}>
            Photos (optionnel)
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={styles.input}
              onChange={(e) =>
                setSelectedFiles(Array.from(e.target.files ?? []))
              }
            />
            {selectedFiles.length > 0 && (
              <span style={styles.muted}>
                {selectedFiles.length} fichier(s) sélectionné(s)
              </span>
            )}
          </label>

          <label style={styles.label}>
            Note / Commentaire (optionnel)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={5000}
              rows={4}
              style={{ ...styles.input, resize: "vertical" }}
              placeholder="Ex. : couleur légèrement différente en vrai, couture à vérifier sur l'épaule…"
            />
          </label>

          {submitError && <p style={styles.errorText}>{submitError}</p>}
          {submitSuccess && (
            <p style={styles.successText}>Contribution envoyée. Merci !</p>
          )}

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </section>
    </div>
  );
}

// ─── Minimal inline styles (no external deps) ─────────────────────────────────

const styles = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "2rem 1rem 4rem",
    fontFamily: "system-ui, sans-serif",
    color: "#1a1a1a",
  } as React.CSSProperties,
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontFamily: "system-ui, sans-serif",
  } as React.CSSProperties,
  header: {
    marginBottom: "2rem",
    borderBottom: "1px solid #e5e5e5",
    paddingBottom: "1.5rem",
  } as React.CSSProperties,
  badge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#6b7280",
    margin: "0 0 0.5rem",
  },
  productName: {
    fontSize: "1.75rem",
    fontWeight: 700,
    margin: "0 0 0.25rem",
  } as React.CSSProperties,
  shareLabel: {
    fontSize: "1rem",
    color: "#374151",
    margin: "0 0 0.5rem",
  } as React.CSSProperties,
  metaLine: {
    fontSize: "0.875rem",
    color: "#6b7280",
    margin: "0.15rem 0",
  } as React.CSSProperties,
  expiry: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginTop: "0.5rem",
  } as React.CSSProperties,
  section: {
    marginBottom: "2.5rem",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "1rem",
    borderBottom: "1px solid #f3f4f6",
    paddingBottom: "0.5rem",
  } as React.CSSProperties,
  imageGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem",
  },
  image: {
    width: 160,
    height: 160,
    objectFit: "cover" as const,
    borderRadius: 6,
    border: "1px solid #e5e7eb",
  },
  pre: {
    whiteSpace: "pre-wrap" as const,
    background: "#f9fafb",
    padding: "1rem",
    borderRadius: 6,
    fontSize: "0.875rem",
    lineHeight: 1.6,
    border: "1px solid #e5e7eb",
  },
  contributionList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  contribution: {
    background: "#f9fafb",
    padding: "1rem",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  } as React.CSSProperties,
  contributionMeta: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
  } as React.CSSProperties,
  contributionNote: {
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
    lineHeight: 1.6,
  } as React.CSSProperties,
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  input: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: "0.875rem",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  button: {
    alignSelf: "flex-start",
    padding: "0.6rem 1.5rem",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  muted: {
    color: "#9ca3af",
    fontSize: "0.8rem",
  } as React.CSSProperties,
  errorText: {
    color: "#dc2626",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  successText: {
    color: "#16a34a",
    fontSize: "0.875rem",
  } as React.CSSProperties,
};
