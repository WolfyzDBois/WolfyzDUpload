#!/bin/bash

cd ../

echo "📦 Installation des dépendances npm..."
npm install

echo "🚀 Déploiement des commandes slash..."
node dist/deploy-command.js

echo "✅ Lancement du bot Discord..."
node dist/index.js
