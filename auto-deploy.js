#!/usr/bin/env node

/**
 * SISTEMA DE DEPLOY AUTOMÁTICO
 * Monitora mudanças nos arquivos e automaticamente faz deploy para produção
 */

import { spawn } from 'child_process';
import { watch } from 'fs';
import path from 'path';

let deployTimeout;
const DEPLOY_DELAY = 3000; // Aguarda 3 segundos após última mudança

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🚀 AUTO-DEPLOY: ${message}`);
}

function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function deployToProduction() {
  try {
    log('Iniciando deploy via API GitHub...');
    log('💡 Contorna restrições do Git no Replit');
    
    // Usar API deploy ao invés de git local
    await executeCommand('node', ['api-deploy.js']);
    
    log('🎉 Deploy concluído! Render irá atualizar automaticamente em ~3 minutos');
    log('📱 Acesse: https://pingpro.onrender.com');
    
  } catch (error) {
    log(`❌ Erro no deploy: ${error.message}`);
  }
}

function scheduleDeployment() {
  // Cancela deploy anterior se houver
  if (deployTimeout) {
    clearTimeout(deployTimeout);
  }
  
  // Agenda novo deploy após período de silêncio
  deployTimeout = setTimeout(() => {
    deployToProduction();
  }, DEPLOY_DELAY);
  
  log('Mudança detectada, deploy agendado em 3 segundos...');
}

// Monitora mudanças nos arquivos importantes
const watchDirs = [
  './client/src',
  './server', 
  './shared',
  '.'
];

const watchOptions = {
  recursive: true
};

log('🎯 Sistema de deploy automático iniciado');
log('💡 Salve qualquer arquivo e o deploy será feito automaticamente');

watchDirs.forEach(dir => {
  try {
    watch(dir, watchOptions, (eventType, filename) => {
      // Ignora arquivos temporários e node_modules
      if (filename && 
          !filename.includes('node_modules') &&
          !filename.includes('.git') &&
          !filename.includes('dist') &&
          !filename.startsWith('.') &&
          !filename.includes('auto-deploy')) {
        
        log(`Arquivo alterado: ${filename}`);
        scheduleDeployment();
      }
    });
    log(`✓ Monitorando: ${dir}`);
  } catch (error) {
    log(`Aviso: Não foi possível monitorar ${dir}`);
  }
});

// Mantém o processo rodando
process.on('SIGINT', () => {
  log('🛑 Sistema de deploy automático interrompido');
  process.exit(0);
});