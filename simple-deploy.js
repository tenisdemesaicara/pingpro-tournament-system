#!/usr/bin/env node

/**
 * DEPLOY SIMPLES - APENAS ARQUIVOS MODIFICADOS
 * Evita rate limiting enviando apenas os arquivos essenciais
 */

import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';

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

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🎯 SIMPLE-DEPLOY: ${message}`);
}

async function deployEssentialFiles() {
  try {
    log('🔑 Conectando ao GitHub...');
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    const owner = 'tenisdemesaicara';
    const repo = 'pingpro-tournament-system';
    const branch = 'main';
    
    // Apenas os arquivos críticos que foram modificados
    const criticalFiles = [
      'client/src/pages/tournament-public.tsx',
      'server/routes.ts'
    ];
    
    log(`📦 Deployando ${criticalFiles.length} arquivos críticos...`);
    
    // Obter SHA atual
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    const currentSha = ref.object.sha;
    
    // Obter commit atual
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: currentSha
    });
    const treeSha = commit.tree.sha;
    
    // Criar blobs com delay para evitar rate limiting
    const tree = [];
    
    for (let i = 0; i < criticalFiles.length; i++) {
      const file = criticalFiles[i];
      try {
        log(`📄 Processando ${file} (${i + 1}/${criticalFiles.length})`);
        
        const content = readFileSync(file, 'utf8');
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64'
        });
        
        tree.push({
          path: file,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        });
        
        // Sleep entre arquivos para evitar rate limiting
        if (i < criticalFiles.length - 1) {
          log('⏱️ Aguardando 500ms...');
          await new Promise(r => setTimeout(r, 500));
        }
        
      } catch (error) {
        log(`❌ Erro no arquivo ${file}: ${error.message}`);
        return false;
      }
    }
    
    log('🌳 Criando árvore...');
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree,
      base_tree: treeSha
    });
    
    log('💾 Criando commit...');
    const timestamp = new Date().toISOString();
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Deploy crítico: página pública + endpoints - ${timestamp}`,
      tree: newTree.sha,
      parents: [currentSha]
    });
    
    log('🚀 Atualizando branch...');
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha
    });
    
    log('🎉 DEPLOY CRÍTICO REALIZADO!');
    log(`📊 ${criticalFiles.length} arquivos essenciais deployados`);
    log('🌐 Render: https://pingpro.onrender.com (atualizando...)');
    log('⏱️ Aguarde 3-5 minutos para ver as mudanças');
    
    return true;
    
  } catch (error) {
    log(`❌ Erro no deploy: ${error.message}`);
    return false;
  }
}

// Executar deploy
deployEssentialFiles();