#!/bin/bash

echo "🚀 Iniciando desenvolvimento com auto-deploy..."

# Para processos anteriores se existirem
echo "🧹 Limpando processos anteriores..."
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "auto-deploy" 2>/dev/null || true
sleep 2

# Inicia o servidor de desenvolvimento em background
echo "🖥️  Iniciando servidor de desenvolvimento..."
npm run dev &
DEV_PID=$!

# Aguarda o servidor iniciar
sleep 5

# Inicia o sistema de auto-deploy
echo "🎯 Ativando auto-deploy..."
npm run auto-deploy &
DEPLOY_PID=$!

echo ""
echo "✅ SISTEMA PRONTO!"
echo "📱 Desenvolvimento: http://localhost:5000"  
echo "🌐 Produção: https://pingpro.onrender.com"
echo ""
echo "💡 COMO USAR:"
echo "   • Edite qualquer arquivo no Replit"
echo "   • O Replit salva automaticamente (sem Ctrl+S)"
echo "   • Deploy automático acontece em 3 segundos"
echo "   • Produção atualiza em ~3 minutos"
echo ""
echo "🛑 Para parar: Ctrl+C"
echo ""

# Função para limpeza quando sair
cleanup() {
    echo ""
    echo "🛑 Parando processos..."
    kill $DEV_PID 2>/dev/null || true
    kill $DEPLOY_PID 2>/dev/null || true
    pkill -f "tsx server/index.ts" 2>/dev/null || true
    pkill -f "auto-deploy" 2>/dev/null || true
    echo "✅ Processos finalizados"
    exit 0
}

# Captura sinais para limpeza
trap cleanup SIGINT SIGTERM

# Aguarda sinalização para parar
wait