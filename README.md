# Creorga POS

Application SaaS de Point de Vente pour TPE/PME luxembourgeoises.

## Prerequis

- Node.js 20+ : https://nodejs.org
- Docker Desktop : https://docker.com/products/docker-desktop
- Git : https://git-scm.com

## Installation

```powershell
# 1. Cloner le repo et aller dans le dossier
cd creorga

# 2. Installer les dependances
npm install

# 3. Copier le fichier d'environnement
copy .env.example .env.local

# 4. Demarrer PostgreSQL et Redis
docker compose -f docker-compose.dev.yml up -d

# 5. Initialiser la base de donnees
cd apps/backend
npx prisma migrate dev --name init
npx ts-node --esm prisma/seed.ts
cd ../..

# 6. Lancer l'application
npm run dev
```

## Acces

- Frontend : http://localhost:5173
- API : http://localhost:3001
- Prisma Studio : `npm run db:studio`
- Depuis tablette (meme WiFi) : http://[IP-DU-PC]:5173

## Compte par defaut

- Email : admin@creorga.local
- Mot de passe : Admin1234!

## Scripts utiles

```powershell
npm run dev           # Lance frontend + backend
npm run dev:web       # Frontend seul
npm run dev:backend   # Backend seul
npm run db:migrate    # Lancer les migrations Prisma
npm run db:seed       # Remplir la base avec les donnees de test
npm run db:studio     # Ouvrir Prisma Studio (GUI base de donnees)
```
