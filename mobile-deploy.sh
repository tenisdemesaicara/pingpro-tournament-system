#!/bin/bash

echo ""
echo "📱 DEPLOY MOBILE - PINGPRO"
echo "=========================="
echo ""

# Deploy via API GitHub (sem git local)
echo "🚀 Iniciando deploy via API GitHub..."
echo "💡 Contorna restrições do Git no Replit"
echo ""

node api-deploy.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOY REALIZADO COM SUCESSO!"
    echo ""
    echo "📋 O que acontece agora:"
    echo "   1. ✅ Código enviado para GitHub"
    echo "   2. 🔄 Render detecta mudanças"
    echo "   3. 🚀 Build automático iniciado"
    echo "   4. 🌐 Site atualizado em 3-5 minutos"
    echo ""
    echo "🔗 Links:"
    echo "   📱 Desenvolvimento: http://localhost:5000"
    echo "   🌐 Produção: https://pingpro.onrender.com"
    echo ""
    echo "⏱️  Aguarde 3-5 minutos para ver as mudanças"
    echo "   em produção!"
else
    echo ""
    echo "❌ ERRO NO DEPLOY!"
    echo "💡 Tente novamente em alguns segundos"
fi

echo ""