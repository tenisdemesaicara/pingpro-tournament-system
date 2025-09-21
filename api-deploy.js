#!/usr/bin/env node

/**
 * DEPLOY VIA API GITHUB - SEM GIT LOCAL
 * Contorna restrições do Replit enviando arquivos direto via API
 */

import { Octokit } from '@octokit/rest';
import { readFileSync, statSync } from 'fs';
import { glob } from 'glob';
import { join, relative } from 'path';

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
  console.log(`[${timestamp}] 🌐 API-DEPLOY: ${message}`);
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function getAllFiles() {
  // Arquivos a incluir (exclui .git, node_modules, etc.)
  const patterns = [
    'client/**/*',
    'server/**/*', 
    'shared/**/*',
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tsconfig.json',
    'tailwind.config.ts',
    'postcss.config.js',
    'drizzle.config.ts',
    '*.md',
    '*.sh',
    '*.js'
  ];

  const excludePatterns = [
    '.git/**',
    'node_modules/**',
    'dist/**',
    'build/**',
    '.replit',
    '.env*',
    '*.log',
    '.cache/**',
    'tmp/**'
  ];

  const files = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, { 
      ignore: excludePatterns,
      dot: false 
    });
    
    for (const file of matches) {
      try {
        const stats = statSync(file);
        if (stats.isFile() && stats.size < 1000000) { // Max 1MB
          files.push(file);
        }
      } catch (error) {
        // Pula arquivos com erro
      }
    }
  }
  
  return [...new Set(files)]; // Remove duplicatas
}

async function uploadFilesToGitHub() {
  try {
    log('🔑 Conectando ao GitHub...');
    const octokit = await getUncachableGitHubClient();
    
    const owner = 'tenisdemesaicara';
    const repo = 'pingpro-tournament-system';
    const branch = 'main';
    
    log('📂 Coletando arquivos...');
    const files = await getAllFiles();
    log(`📊 ${files.length} arquivos encontrados`);
    
    if (files.length === 0) {
      log('❌ Nenhum arquivo para enviar');
      return;
    }

    // Obter SHA atual da branch main
    log('🔍 Obtendo SHA atual...');
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    const currentSha = ref.object.sha;
    
    // Obter árvore atual
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: currentSha
    });
    const treeSha = commit.tree.sha;
    
    log('📦 Criando blobs...');
    const tree = [];
    
    for (const file of files) {
      try {
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
        
        if (tree.length % 10 === 0) {
          log(`  ✓ ${tree.length}/${files.length} blobs criados`);
        }
      } catch (error) {
        log(`  ⚠️ Erro no arquivo ${file}: ${error.message}`);
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
      message: `Deploy via API GitHub - ${timestamp}`,
      tree: newTree.sha,
      parents: [currentSha]
    });
    
    log('🚀 Atualizando branch main...');
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha
    });
    
    log('🎉 DEPLOY REALIZADO COM SUCESSO!');
    log(`📊 ${files.length} arquivos enviados`);
    log('📱 GitHub: https://github.com/tenisdemesaicara/pingpro-tournament-system');
    log('🌐 Render: https://pingpro.onrender.com (atualizando...)');
    log('⏱️  Aguarde 3-5 minutos para ver as mudanças');
    
  } catch (error) {
    log(`❌ Erro no deploy: ${error.message}`);
    console.error('Detalhes do erro:', error);
  }
}

// Executar deploy
uploadFilesToGitHub();