#!/bin/bash

echo "🚀 DEPLOY MANUAL INICIADO..."
echo "📱 Preparando deploy para GitHub + Render..."

# Adicionar todas as mudanças
git add .

# Fazer commit com timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "Deploy manual mobile - $TIMESTAMP"

echo "📦 Commit realizado: $TIMESTAMP"

# Push para GitHub
git push origin main

echo "✅ Push para GitHub concluído!"
echo "🌐 Render vai detectar e fazer deploy automaticamente"
echo "🔗 Produção: https://pingpro.onrender.com"
echo "⏱️  Deploy estará pronto em 3-5 minutos"
echo ""
echo "🎯 DEPLOY COMPLETO! Aguarde alguns minutos..."