# Utilise une image Node.js LTS légère
FROM node:22-slim

# Crée un répertoire de travail
WORKDIR /app

# Copie les fichiers de configuration
COPY config/ ./config/

# Copie les fichiers de build (TypeScript compilé)
COPY dist/ ./dist/

# Copie les fichiers package pour installation
COPY package.json package-lock.json ./

# Installe uniquement les dépendances nécessaires à l'exécution
RUN npm install --omit=dev --no-audit

# Déploie les commandes slash lors de la création du conteneur
RUN node dist/deploy-commands.js || echo "⚠️ Échec du déploiement des commandes (peut être déjà fait)"

# Lancer le bot
CMD ["node", "dist/index.js"]
