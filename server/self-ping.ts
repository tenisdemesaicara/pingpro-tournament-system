// 🚀 Auto Keep-Alive interno - roda dentro da própria aplicação

let pingInterval: NodeJS.Timeout | null = null;

// Função para fazer self-ping
async function performSelfPing() {
  try {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
    
    // Não fazer ping em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    
    console.log('🔥 Self-ping iniciado...');
    
    // Ping interno usando fetch
    const healthResponse = await fetch(`${baseUrl}/api/healthz`);
    if (healthResponse.ok) {
      console.log('✅ Self-ping health OK');
    }
    
    // Warmup interno
    const warmupResponse = await fetch(`${baseUrl}/api/warmup`, {
      method: 'POST'
    });
    if (warmupResponse.ok) {
      console.log('🔥 Self-ping warmup OK');
    }
    
  } catch (error) {
    console.log('⚠️ Self-ping falhou:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Inicializar auto keep-alive
export function startSelfPing() {
  // Só em produção
  if (process.env.NODE_ENV !== 'production') {
    console.log('🏁 Self-ping desabilitado em desenvolvimento');
    return;
  }
  
  console.log('🚀 Iniciando self-ping automático...');
  
  // Primeiro ping após 5 minutos
  setTimeout(performSelfPing, 5 * 60 * 1000);
  
  // Ping a cada 12 minutos
  pingInterval = setInterval(performSelfPing, 12 * 60 * 1000);
}

// Parar keep-alive
export function stopSelfPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    console.log('🛑 Self-ping parado');
  }
}