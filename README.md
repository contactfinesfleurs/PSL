# PSL Studio

Outil de gestion de collections mode : produits, samples, événements, campagnes et prêts presse.

## Stack technique

- **Next.js 15** (App Router, TypeScript)
- **Prisma** + **PostgreSQL** (Neon)
- **Tailwind CSS**
- **Vercel Blob** (stockage fichiers)
- **Anthropic Claude** (agents IA)
- **17track** (suivi colis)

## Setup local

```bash
# 1. Cloner le dépôt
git clone <repo-url> && cd psl-app

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# 4. Pousser le schéma Prisma vers la base
npm run db:push

# 5. Lancer le serveur de développement
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète.

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL poolée (Neon) |
| `DATABASE_URL_UNPOOLED` | URL PostgreSQL directe (migrations) |
| `JWT_SECRET` | Clé secrète JWT (min. 32 caractères) |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob |
| `SEVENTEEN_TRACK_API_KEY` | Clé API 17track |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run db:push` | Synchroniser le schéma Prisma |
| `npm run db:studio` | Interface graphique Prisma Studio |
| `npm run agents` | Lancer tous les agents IA |
| `npm run agents:security` | Agent sécurité uniquement |
| `npm run agents:design` | Agent design uniquement |

## Structure du projet

```
src/
├── app/
│   ├── api/          # Routes API (products, events, campaigns, samples, loans…)
│   └── (pages)/      # Pages Next.js
├── components/       # Composants React réutilisables
├── lib/              # Utilitaires (prisma, auth, audit, generators…)
agents/               # Agents IA Anthropic
prisma/
└── schema.prisma     # Schéma de base de données
scripts/              # Scripts Node (run-agents…)
```
