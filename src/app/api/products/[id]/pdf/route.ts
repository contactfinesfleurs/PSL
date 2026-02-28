import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { samples: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const sample = product.samples[0];

  // Generate HTML for PDF (using browser print)
  const reviewNotes = sample?.reviewNotes ?? "";
  const reviewPhotos: string[] = sample?.reviewPhotoPaths
    ? JSON.parse(sample.reviewPhotoPaths)
    : [];

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport de Non-Validation — ${product.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 40px; }
    .header { border-bottom: 2px solid #7e22ce; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 22px; color: #7e22ce; }
    .header p { font-size: 13px; color: #666; margin-top: 6px; }
    .badge { display: inline-block; background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5;
             border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: bold; margin-top: 8px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 14px; font-weight: bold; color: #374151; border-left: 3px solid #7e22ce;
                  padding-left: 10px; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
    .info-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-item .value { font-size: 13px; color: #111827; font-weight: 500; margin-top: 2px; }
    .notes-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 14px;
                 font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
    .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
    .photos-grid img { width: 100%; height: 160px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }
    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;
              font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport de Non-Validation — Prototypage</h1>
    <p>Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
    <span class="badge">NON VALIDÉ</span>
  </div>

  <div class="section">
    <h2>Informations produit</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Nom du produit</div>
        <div class="value">${product.name}</div>
      </div>
      <div class="info-item">
        <div class="label">Référence SKU</div>
        <div class="value">${product.sku}</div>
      </div>
      <div class="info-item">
        <div class="label">Famille</div>
        <div class="value">${product.family}</div>
      </div>
      <div class="info-item">
        <div class="label">Saison</div>
        <div class="value">${product.season} ${product.year}</div>
      </div>
    </div>
  </div>

  ${
    reviewNotes
      ? `<div class="section">
    <h2>Points à corriger / Notes de révision</h2>
    <div class="notes-box">${reviewNotes}</div>
  </div>`
      : ""
  }

  ${
    reviewPhotos.length > 0
      ? `<div class="section">
    <h2>Photos des détails à revoir (${reviewPhotos.length})</h2>
    <div class="photos-grid">
      ${reviewPhotos.map((p) => `<img src="${p}" alt="Détail à revoir" />`).join("")}
    </div>
  </div>`
      : ""
  }

  <div class="footer">
    <p>PSL Studio — Document confidentiel destiné au fournisseur</p>
    <p>Produit : ${product.name} · SKU : ${product.sku}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
