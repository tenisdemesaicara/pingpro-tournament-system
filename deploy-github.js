#!/usr/bin/env node

/**
 * DEPLOY USANDO INTEGRAÇÃO GITHUB DO REPLIT
 * Usa o token de acesso fornecido pela integração para push seguro
 */

import { spawn } from 'child_process';
import { Octokit } from '@octokit/rest';

// Código da integração GitHub do Replit
let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
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

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🚀 GITHUB-DEPLOY: ${message}`);
}

async function deployToGitHub() {
  try {
    log('🔑 Obtendo token de acesso do GitHub...');
    const accessToken = await getAccessToken();
    log('✅ Token obtido com sucesso');

    log('🔍 Verificando mudanças...');
    const gitStatus = spawn('git', ['status', '--porcelain'], { stdio: 'pipe' });
    let hasChanges = false;
    
    gitStatus.stdout.on('data', (data) => {
      if (data.toString().trim()) {
        hasChanges = true;
      }
    });
    
    await new Promise((resolve) => {
      gitStatus.on('close', resolve);
    });
    
    if (!hasChanges) {
      log('ℹ️  Nenhuma mudança detectada, pulando deploy');
      return;
    }

    log('⚙️ Configurando identidade Git...');
    await executeCommand('git', ['config', 'user.name', 'PingPro Bot']);
    await executeCommand('git', ['config', 'user.email', 'bot@pingpro.com']);

    log('📦 Adicionando arquivos...');
    await executeCommand('git', ['add', '.']);

    log('💾 Criando commit...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const commitMessage = `Deploy com GitHub integration - ${timestamp}`;
    await executeCommand('git', ['commit', '-m', commitMessage]);

    log('🚀 Enviando para GitHub com token de acesso...');
    
    // Configurar remote com token
    const repoUrl = `https://x-access-token:${accessToken}@github.com/tenisdemesaicara/pingpro-tournament-system.git`;
    await executeCommand('git', ['remote', 'set-url', 'origin', repoUrl]);
    
    // Push para GitHub
    await executeCommand('git', ['push', 'origin', 'main']);
    
    log('🎉 Deploy realizado com sucesso!');
    log('📱 GitHub: https://github.com/tenisdemesaicara/pingpro-tournament-system');
    log('🌐 Render: https://pingpro.onrender.com (atualizando...)');
    log('⏱️  Aguarde 3-5 minutos para ver as mudanças');

  } catch (error) {
    log(`❌ Erro no deploy: ${error.message}`);
    console.error('Detalhes do erro:', error);
  }
}

// Executar deploy
deployToGitHub();