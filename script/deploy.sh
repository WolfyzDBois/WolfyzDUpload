#!/bin/bash

cd ../

echo "📦 Installation des dépendances..."
npm install

echo "⚙️ Déploiement de la commande /upload..."
npx ts-node src/deploy-commands.ts

echo "✅ Installation terminée."
