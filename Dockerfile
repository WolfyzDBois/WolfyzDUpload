FROM node:22-slim
WORKDIR /app
COPY config/ ./config/
COPY dist/ ./dist/
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit
RUN node dist/deploy-commands.js || echo "⚠️ Échec du déploiement des commandes (peut être déjà fait)"
CMD ["node", "dist/index.js"]