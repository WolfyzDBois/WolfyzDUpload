#!/bin/bash

cd ../

echo "♻️ Redémarrage du bot Discord..."

docker compose stop
docker compose up -d

echo "✅ Bot redémarré avec succès."
