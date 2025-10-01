import { Octokit } from '@octokit/rest';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
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
  console.log(`[${timestamp}] 🚀 SMART-DEPLOY: ${message}`);
}

function computeGitBlobSHA(content) {
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const header = `blob ${contentBuffer.length}\0`;
  const fullContent = Buffer.concat([Buffer.from(header), contentBuffer]);
  return createHash('sha1').update(fullContent).digest('hex');
}

async function getRemoteTree(octokit, owner, repo, treeSha) {
  log('🌳 Obtendo árvore remota...');
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: true
  });
  
  const treeMap = {};
  tree.tree.forEach(item => {
    if (item.type === 'blob') {
      treeMap[item.path] = item.sha;
    }
  });
  
  return treeMap;
}

function getLocalFiles() {
  const patterns = [
    'client/**/*',
    'server/**/*',
    'shared/**/*',
    'package.json',
    'package-lock.json',
    'render.yaml',
    'tsconfig.json',
    'tailwind.config.ts',
    'vite.config.ts',
    '*.md',
    '*.sh',
    '*.js'
  ];

  const excludePatterns = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '**/*.log',
    '.env*',
    '.replit*',
    'attached_assets/**'
  ];

  let allFiles = [];
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      ignore: excludePatterns,
      nodir: true 
    });
    allFiles = allFiles.concat(files);
  });

  // Remove duplicatas e normalizar caminhos
  allFiles = [...new Set(allFiles)].map(file => file.replace(/\\/g, '/'));
  
  log(`📁 Encontrados ${allFiles.length} arquivos locais`);
  return allFiles;
}

function detectChanges(localFiles, remoteTree) {
  const changes = {
    adds: [],
    updates: [],
    deletes: []
  };

  // Verificar arquivos locais (adds/updates)
  localFiles.forEach(filePath => {
    if (!existsSync(filePath)) return;
    
    // Detectar se é arquivo binário pela extensão
    const isBinary = /\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|mp4|mov|avi)$/i.test(filePath);
    const content = readFileSync(filePath, isBinary ? null : 'utf8');
    const localSha = computeGitBlobSHA(content);
    const remoteSha = remoteTree[filePath];
    
    if (!remoteSha) {
      changes.adds.push({ path: filePath, content, isBinary });
    } else if (localSha !== remoteSha) {
      changes.updates.push({ path: filePath, content, isBinary });
    }
  });

  // Verificar deletions (arquivos que existem remotamente mas não localmente)
  Object.keys(remoteTree).forEach(remotePath => {
    if (!localFiles.includes(remotePath)) {
      changes.deletes.push({ path: remotePath });
    }
  });

  return changes;
}

function prioritizeFiles(changes) {
  const criticalPrefixes = [
    'shared/schema.ts',
    'server/',
    'client/src/',
    'package.json'
  ];

  const allChanges = [...changes.adds, ...changes.updates, ...changes.deletes];
  
  const critical = [];
  const normal = [];

  allChanges.forEach(change => {
    const isCritical = criticalPrefixes.some(prefix => change.path.startsWith(prefix));
    if (isCritical) {
      critical.push(change);
    } else {
      normal.push(change);
    }
  });

  return [...critical, ...normal];
}

function createBatches(changes, maxFilesPerBatch = 50, maxSizePerBatch = 2.5 * 1024 * 1024) {
  const batches = [];
  let currentBatch = [];
  let currentSize = 0;

  changes.forEach(change => {
    const size = change.content ? (Buffer.isBuffer(change.content) ? change.content.length : Buffer.byteLength(change.content, 'utf8')) : 0;
    
    // GitHub tem limite de 100MB por arquivo, vamos usar um limite razoável de 10MB
    if (size > 10 * 1024 * 1024) {
      log(`⚠️ Arquivo muito grande ignorado: ${change.path} (${(size / 1024 / 1024).toFixed(2)}MB) - Limite: 10MB`);
      return;
    }

    // Verificar se precisa criar novo batch
    if (currentBatch.length >= maxFilesPerBatch || 
        (currentSize + size) > maxSizePerBatch) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
    }

    currentBatch.push(change);
    currentSize += size;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function deployBatch(octokit, owner, repo, batch, parentSha, batchIndex) {
  log(`📦 Deployando batch ${batchIndex + 1} com ${batch.length} arquivos...`);

  // Criar tree entries
  const tree = batch.map(change => {
    if (change.content) {
      // Add ou update
      const entry = {
        path: change.path,
        mode: '100644',
        type: 'blob'
      };
      
      if (change.isBinary) {
        // Para arquivos binários, usar content base64
        entry.content = change.content.toString('base64');
        entry.encoding = 'base64';
      } else {
        // Para arquivos texto, usar content normal
        entry.content = change.content;
      }
      
      return entry;
    } else {
      // Delete
      return {
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: null
      };
    }
  });

  // Criar tree
  const { data: treeData } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree,
    base_tree: parentSha
  });

  // Criar commit
  const commitMessage = `Deploy batch ${batchIndex + 1}: ${batch.length} files`;
  const { data: commitData } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: treeData.sha,
    parents: [parentSha]
  });

  return commitData.sha;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deployWithBackoff(octokit, owner, repo, batch, parentSha, batchIndex, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await deployBatch(octokit, owner, repo, batch, parentSha, batchIndex);
    } catch (error) {
      if (error.status === 403 && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
        log(`⚠️ Rate limit atingido, aguardando ${delay}ms antes de tentar novamente...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

async function smartDeploy() {
  try {
    log('🔑 Conectando ao GitHub...');
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    const owner = 'tenisdemesaicara';
    const repo = 'pingpro-tournament-system';
    const branch = 'main';
    
    // Obter estado atual do repositório
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    let currentSha = ref.object.sha;
    
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: currentSha
    });
    const treeSha = commit.tree.sha;
    
    // Detectar mudanças
    log('🔍 Detectando mudanças...');
    const remoteTree = await getRemoteTree(octokit, owner, repo, treeSha);
    const localFiles = getLocalFiles();
    const changes = detectChanges(localFiles, remoteTree);
    
    const totalChanges = changes.adds.length + changes.updates.length + changes.deletes.length;
    
    if (totalChanges === 0) {
      log('✅ Nenhuma mudança detectada. Deploy não necessário.');
      return;
    }
    
    log(`📊 Mudanças detectadas: ${changes.adds.length} novos, ${changes.updates.length} atualizados, ${changes.deletes.length} deletados`);
    
    // Priorizar e criar batches
    const prioritizedChanges = prioritizeFiles(changes);
    const batches = createBatches(prioritizedChanges);
    
    log(`🔄 Iniciando deploy em ${batches.length} batches...`);
    
    // Deploy de cada batch
    for (let i = 0; i < batches.length; i++) {
      const newCommitSha = await deployWithBackoff(octokit, owner, repo, batches[i], currentSha, i);
      currentSha = newCommitSha;
      
      // Delay entre batches
      if (i < batches.length - 1) {
        await sleep(1500); // 1.5s entre batches
      }
    }
    
    // Atualizar ref final
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: currentSha
    });
    
    log(`✅ Deploy completo! ${totalChanges} arquivos deployados em ${batches.length} batches`);
    log('🌐 Render irá automatically fazer rebuild em alguns minutos');
    
  } catch (error) {
    console.error('❌ Erro no deploy:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  smartDeploy();
}

export { smartDeploy };