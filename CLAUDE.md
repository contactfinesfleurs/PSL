# PSL — Guide d'architecture pour Claude

Ce fichier décrit les règles architecturales que tout agent Claude **doit respecter**
avant de modifier le code. Il est conçu pour que chaque intervention préserve la
sécurité et ne casse pas les données existantes.

---

## 1. Gestion des fichiers — règle absolue

**Toute opération sur des fichiers passe par `src/lib/storage.ts`. Jamais directement.**

```
src/lib/storage.ts   ← source unique pour put / del / get / validation d'URL
```

### Ce que tu dois faire

| Action | Appel correct |
|--------|---------------|
| Uploader un fichier | `storeFile(file, folder)` |
| Supprimer un fichier | `deleteStoredFile(storedPath)` |
| Valider qu'un chemin est sûr | `isStoredPath(s)` |
| Vérifier qu'un URL est un blob Vercel (proxy/migration seulement) | `isVercelBlobHostname(url)` |

### Ce que tu ne dois jamais faire

```typescript
// ❌ NE JAMAIS faire ça dans une route ou un composant
import { put } from "@vercel/blob";
const blob = await put(filename, file, { access: "public" });
db.update({ photoPath: blob.url }); // raw URL en base → FAILLE SÉCURITÉ

// ✅ À la place
import { storeFile } from "@/lib/storage";
const stored = await storeFile(file, "photos");
db.update({ photoPath: stored.path }); // proxied path → sécurisé
```

### Invariant à ne jamais rompre

> Tout chemin écrit en base de données doit satisfaire `isStoredPath()`.
> Aucune URL `https://…vercel-storage.com/…` ne doit jamais être stockée en DB.

---

## 2. Validation d'URL dans le HTML généré

Pour tout endroit où une URL de fichier est embarquée dans du HTML (rapport PDF,
attribut `src`, etc.), utiliser `isTrustedImageUrl()` de `src/lib/formatters.ts`.

```typescript
import { isTrustedImageUrl } from "@/lib/formatters";

// Filtrer avant d'embarquer
const safePaths = paths.filter(isTrustedImageUrl);
```

Cette fonction accepte uniquement les paths produits par `storeFile()`.
Elle contient un cas legacy (raw blob URLs) qui sera supprimé après migration.

---

## 3. Ajouter un nouveau champ fichier sur un modèle Prisma

1. Ajouter le champ dans `prisma/schema.prisma` (`String?` pour un chemin unique,
   `String?` pour un tableau JSON).
2. Upload → appeler `storeFile()`, stocker `stored.path`.
3. Lecture → pour les tableaux : `safeParseArray()` de `lib/formatters.ts`.
4. Affichage HTML → filtrer avec `isTrustedImageUrl()`.
5. Suppression → appeler `deleteStoredFile(storedPath)` avant `db.delete()`.

Pas de migration de données nécessaire si le champ est nouveau.

---

## 4. Changer de provider de stockage (ex: S3 à la place de Vercel Blob)

Modifier uniquement `src/lib/storage.ts` :
- `storeFile()` → nouveau provider
- `deleteStoredFile()` → nouveau provider
- `fetchBlobContent()` → nouveau provider
- Mettre à jour `isVercelBlobHostname()` si le format d'URL change

Les routes, composants et scripts de migration ne changent pas.

---

## 5. Migration des blobs publics → privés

Si des blobs publics existent encore en base (URL raw `https://…vercel-storage.com/…`) :

```bash
# Prévisualiser
npx dotenv -e .env.local -- npm run blob:migrate:dry

# Appliquer
npx dotenv -e .env.local -- npm run blob:migrate
```

Après migration réussie :
- Supprimer la branche `isLegacyPublicBlobUrl()` dans `src/lib/formatters.ts`
- Supprimer la fonction `isLegacyPublicBlobUrl()` de `src/lib/storage.ts`

---

## 6. Structure des fichiers importants

```
src/
  lib/
    storage.ts      ← TOUTES les opérations fichier (lire en premier)
    auth.ts         ← getSessionFromRequest() — auth obligatoire sur toutes les routes
    formatters.ts   ← isTrustedImageUrl(), escapeHtml(), safeParseArray()
    prisma.ts       ← client Prisma singleton
  app/api/
    upload/         ← POST /api/upload — délègue à storeFile()
    blob/           ← GET /api/blob?url= — proxy authentifié Vercel Blob
    files/[...path] ← GET /api/files/.. — proxy authentifié filesystem (dev)
scripts/
  migrate-blobs-to-private.ts  ← migration one-shot (idempotente)
```

---

## 7. Règles générales

- Toute route API vérifie la session avec `getSessionFromRequest()` avant tout.
- `escapeHtml()` sur toute donnée utilisateur interpolée dans du HTML.
- `safeParseArray()` pour lire les champs JSON stockés en base (`sketchPaths`, etc.).
- Ne pas stocker de données sensibles dans des champs JSON en clair non chiffrés.
