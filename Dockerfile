# Utilise une image Node.js LTS légère
FROM node:20-slim

# Crée un répertoire de travail
WORKDIR /app

# Copie uniquement les fichiers nécessaires (build + config)
COPY user.json ./
COPY dist/ ./dist/
COPY package.json package-lock.json ./
COPY .env ./

# Installe uniquement les dépendances nécessaires au runtime
RUN npm install --omit=dev --no-audit

# Lancer le bot
CMD ["node", "dist/index.js"]
