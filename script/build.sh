#!/bin/bash
echo "🛠️ Compilation TypeScript vers ./dist..."
cd ../
npx tsc

echo "✅ Build terminé. Fichiers JS dans le dossier ./dist"
