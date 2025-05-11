#!/bin/bash

cd ../ 

echo "🔄 Build de l'image Docker avec docker-compose..."
docker compose build

echo "🚀 Lancement du bot Discord en arrière-plan..."
docker compose up -d

# echo "📄 Affichage des logs en direct (CTRL+C pour quitter)..."
# docker compose logs -f
