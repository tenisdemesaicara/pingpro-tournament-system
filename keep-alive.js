#!/usr/bin/env node

/**
 * 🚀 KEEP-ALIVE AUTOMÁTICO - Anti Cold Start para Render
 * 
 * Este script mantém o servidor sempre acordado fazendo pings automáticos
 * Funciona tanto no plano gratuito quanto pago do Render
 */

const https = require('https');
const http = require('http');

// ========================================
// 🔧 CONFIGURAÇÕES
// ========================================

const CONFIG = {
  // URL da sua aplicação no Render
  baseUrl: process.env.RENDER_URL || 'https://pingpro.onrender.com',
  
  // Intervalo entre pings (em minutos) 
  // Render hiberna após ~15 min, então 12 min é seguro
  intervalMinutes: 12,
  
  // Timeout para requests
  timeoutMs: 30000,
  
  // Logs detalhados
  verbose: true
};

// ========================================
// 🔍 FUNÇÕES UTILITÁRIAS
// ========================================

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'KeepAlive-Bot/1.0',
        'Accept': 'application/json'
      },
      timeout: CONFIG.timeoutMs
    };

    if (data && method === 'POST') {
      const postData = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: responseData ? JSON.parse(responseData) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// ========================================
// 🎯 KEEP-ALIVE PRINCIPAL
// ========================================

async function performKeepAlive() {
  try {
    log('🔥 Iniciando keep-alive...');
    
    // 1. Health check rápido
    const startTime = Date.now();
    const healthResult = await makeRequest(`${CONFIG.baseUrl}/api/healthz`);
    const healthDuration = Date.now() - startTime;
    
    if (healthResult.status === 200) {
      log(`✅ Health check OK (${healthDuration}ms) - Uptime: ${healthResult.data?.uptime?.toFixed(1)}s`);
    } else {
      log(`⚠️  Health check retornou ${healthResult.status}`);
    }
    
    // 2. Warmup (pré-aquecimento)
    try {
      const warmupResult = await makeRequest(`${CONFIG.baseUrl}/api/warmup`, 'POST');
      
      if (warmupResult.status === 200) {
        log(`🔥 Warmup OK (${warmupResult.data?.duration}) - Componentes: OK`);
      } else {
        log(`⚠️  Warmup retornou ${warmupResult.status}`);
      }
    } catch (warmupError) {
      log(`⚠️  Warmup falhou: ${warmupError.message}`);
    }
    
    log(`✅ Keep-alive completo! Próximo ping em ${CONFIG.intervalMinutes} minutos`);
    
  } catch (error) {
    log(`❌ Keep-alive falhou: ${error.message}`);
    
    // Se o servidor estiver realmente dormindo, pode demorar mais
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      log(`⏳ Servidor pode estar inicializando... Tentando novamente em breve`);
    }
  }
}

// ========================================
// 🕒 AGENDADOR
// ========================================

function startKeepAlive() {
  log(`🚀 Keep-Alive iniciado para ${CONFIG.baseUrl}`);
  log(`⏰ Intervalo: ${CONFIG.intervalMinutes} minutos`);
  log(`🎯 Objetivo: Manter aplicação sempre ativa (sem cold start)`);
  log('=====================================');
  
  // Ping imediato
  performKeepAlive();
  
  // Agendar pings regulares
  const intervalMs = CONFIG.intervalMinutes * 60 * 1000;
  setInterval(performKeepAlive, intervalMs);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    log('🛑 Keep-alive interrompido pelo usuário');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('🛑 Keep-alive finalizado');
    process.exit(0);
  });
}

// ========================================
// 🎬 EXECUÇÃO
// ========================================

if (require.main === module) {
  // Verificar se URL foi fornecida
  if (!CONFIG.baseUrl) {
    console.error('❌ ERRO: Defina RENDER_URL ou modifique baseUrl no script');
    process.exit(1);
  }
  
  startKeepAlive();
}

module.exports = { performKeepAlive, startKeepAlive };