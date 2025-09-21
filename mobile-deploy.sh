#!/bin/bash

echo ""
echo "📱 DEPLOY MOBILE - PINGPRO"
echo "=========================="
echo ""

# Detecta se há mudanças
echo "🔍 Verificando mudanças..."
if [ -z "$(git status --porcelain)" ]; then
    echo "❌ Nenhuma mudança detectada."
    echo "💡 Edite qualquer arquivo no Replit e tente novamente."
    echo "   (O Replit salva automaticamente - sem Ctrl+S)"
    exit 0
fi

echo "✅ Mudanças detectadas! Iniciando deploy..."
echo ""

# Adiciona e commita mudanças
echo "📦 Criando commit..."
git add .
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
git commit -m "Deploy mobile - $TIMESTAMP"

echo "✅ Commit criado"
echo ""

# Push para GitHub (e Render)
echo "🚀 Enviando para produção..."
git push origin main

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