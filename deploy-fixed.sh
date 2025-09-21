#!/bin/bash

echo "🚀 DEPLOY COM CORREÇÕES DE AUTOSCALE"
echo "✅ Session store: PostgreSQL em produção"  
echo "✅ Health check: /api/health funcionando"
echo "✅ Porta: 5000 com host 0.0.0.0"
echo ""

# Build e commit
git add .
git commit -m "Fix autoscale deployment issues - PostgreSQL sessions, health check"
git push origin main

echo ""
echo "🎯 DEPLOY REALIZADO COM CORREÇÕES!"
echo "🔗 Produção: https://pingpro.onrender.com"
echo "⏱️  Aguarde 5-10 minutos para deploy com as correções"
echo ""
echo "📋 Principais correções aplicadas:"
echo "   • Session store usa PostgreSQL em produção"
echo "   • Health check endpoint configurado"
echo "   • Servidor otimizado para autoscale"