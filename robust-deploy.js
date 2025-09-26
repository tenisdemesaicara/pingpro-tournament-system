#!/usr/bin/env node

/**
 * ROBUST DEPLOY - SNAPSHOT COMPLETO 
 * Envia TODOS os arquivos como snapshot determinístico, sem merge/diff
 * Suporte completo a arquivos binários e controle de rate limiting
 */

import { Octokit } from '@octokit/rest';
import { readFileSync, statSync, existsSync } from 'fs';
import { glob } from 'glob';

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
  console.log(`[${timestamp}] 🎯 ROBUST-DEPLOY: ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllFiles() {
  const includeAttachments = process.env.INCLUDE_ATTACHMENTS === 'true';
  
  // Padrões expandidos incluindo uploads e todos os arquivos importantes
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
    '*.js',
    'smart-deploy.js',
    'api-deploy.js',
    'simple-deploy.js'
  ];

  // Incluir uploads se solicitado
  if (includeAttachments) {
    patterns.push('attached_assets/**/*');
  }

  const excludePatterns = [
    '.git/**',
    'node_modules/**',
    'dist/**',
    'build/**',
    '.replit',
    '.replit.*',
    '.env*',
    '**/*.log',
    '.cache/**',
    'tmp/**',
    '/tmp/**'
  ];

  log('🔍 Coletando arquivos...');
  const files = [];
  
  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { 
        ignore: excludePatterns,
        dot: false,
        nodir: true 
      });
      
      for (const file of matches) {
        if (!existsSync(file)) continue;
        
        try {
          const stats = statSync(file);
          if (stats.isFile()) {
            const sizeInMB = stats.size / (1024 * 1024);
            
            // GitHub limit é 100MB, vamos usar 50MB como seguro
            if (stats.size < 50 * 1024 * 1024) {
              files.push({
                path: file.replace(/\\/g, '/'), // Normalizar path
                size: stats.size
              });
            } else {
              log(`⚠️ Arquivo muito grande ignorado: ${file} (${sizeInMB.toFixed(2)}MB)`);
            }
          }
        } catch (error) {
          log(`⚠️ Erro lendo stats de ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      log(`⚠️ Erro no padrão ${pattern}: ${error.message}`);
    }
  }
  
  // Remove duplicatas e ordena por tamanho (menores primeiro)
  const uniqueFiles = [...new Map(files.map(f => [f.path, f])).values()]
    .sort((a, b) => a.size - b.size);
  
  const totalSize = uniqueFiles.reduce((sum, f) => sum + f.size, 0);
  log(`📁 ${uniqueFiles.length} arquivos encontrados (${(totalSize / 1024 / 1024).toFixed(2)}MB total)`);
  
  return uniqueFiles;
}

async function createBlobWithRetry(octokit, owner, repo, content, path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });
      return blob.sha;
    } catch (error) {
      if ((error.status === 403 || error.status === 429) && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
        log(`⚠️ Rate limit para ${path}, tentativa ${attempt}/${retries}, aguardando ${delay}ms...`);
        await sleep(delay);
      } else {
        throw new Error(`Falha ao criar blob para ${path}: ${error.message}`);
      }
    }
  }
}

async function robustDeploy() {
  const isDryRun = process.env.DRY_RUN === 'true';
  const startTime = Date.now();
  
  try {
    log('🔑 Conectando ao GitHub...');
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    const owner = 'tenisdemesaicara';
    const repo = 'pingpro-tournament-system';
    const branch = 'main';
    
    // 1. Coletar todos os arquivos
    const files = await getAllFiles();
    
    if (files.length === 0) {
      log('❌ Nenhum arquivo para enviar');
      return;
    }

    if (isDryRun) {
      log('🧪 DRY RUN - apenas simulando');
      files.forEach((file, i) => {
        log(`  ${i+1}. ${file.path} (${(file.size / 1024).toFixed(1)}KB)`);
      });
      log(`📊 Total: ${files.length} arquivos`);
      return;
    }

    // 2. Obter SHA atual da branch
    log('🔍 Obtendo SHA atual da branch...');
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    const currentSha = ref.object.sha;
    
    // 3. Criar blobs para todos os arquivos com controle de concorrência
    log('📦 Criando blobs (upload de arquivos)...');
    const tree = [];
    const concurrencyLimit = 3; // Máximo 3 uploads simultâneos
    let processed = 0;
    
    // Processar em lotes para controlar concorrência
    for (let i = 0; i < files.length; i += concurrencyLimit) {
      const batch = files.slice(i, i + concurrencyLimit);
      
      const promises = batch.map(async (file) => {
        try {
          // Ler arquivo como Buffer (suporte binário completo)
          const content = readFileSync(file.path);
          const sha = await createBlobWithRetry(octokit, owner, repo, content, file.path);
          
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: sha
          };
        } catch (error) {
          log(`❌ Falha ao processar ${file.path}: ${error.message}`);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result) {
          tree.push(result);
          processed++;
          if (processed % 10 === 0) {
            log(`  ✓ ${processed}/${files.length} blobs criados`);
          }
        }
      }
      
      // Pequena pausa entre lotes
      if (i + concurrencyLimit < files.length) {
        await sleep(500);
      }
    }
    
    if (tree.length === 0) {
      log('❌ Nenhum blob foi criado com sucesso');
      return;
    }
    
    // 4. Criar árvore completa SEM base_tree (snapshot completo)
    log('🌳 Criando árvore completa (snapshot)...');
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree // SEM base_tree - isso cria snapshot completo
    });
    
    // 5. Criar commit
    log('💾 Criando commit...');
    const timestamp = new Date().toISOString();
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `🚀 Robust Deploy - ${files.length} arquivos - ${timestamp}`,
      tree: newTree.sha,
      parents: [currentSha]
    });
    
    // 6. Atualizar branch com force (determinístico)
    log('🚀 Atualizando branch main...');
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
      force: true // Force update para garantir consistência
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    log('🎉 DEPLOY ROBUSTO REALIZADO COM SUCESSO!');
    log(`📊 ${tree.length}/${files.length} arquivos deployados`);
    log(`⏱️ Tempo total: ${duration.toFixed(1)}s`);
    log('📱 GitHub: https://github.com/tenisdemesaicara/pingpro-tournament-system');
    log('🌐 Render: https://pingpro.onrender.com');
    log('⏳ Aguarde 3-5 minutos para ver as mudanças na produção');
    
  } catch (error) {
    log(`❌ Erro crítico no deploy: ${error.message}`);
    console.error('Stack trace completo:', error);
    process.exit(1);
  }
}

// Executar deploy robusto
log('🎯 Iniciando ROBUST DEPLOY...');
robustDeploy();