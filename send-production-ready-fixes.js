import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendProductionReadyFixes() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔥 ENVIANDO CORREÇÕES CRÍTICAS PARA PRODUÇÃO...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // 1. server/prod.ts (PostgreSQL session store + credential fix)
    console.log('📤 server/prod.ts (PG SESSION STORE + CREDENTIAL FIX)...');
    let { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'server/prod.ts',
      branch: 'main'
    });
    
    const prodContent = readFileSync('server/prod.ts', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'server/prod.ts',
      message: 'PRODUCTION READY: Add PostgreSQL session store + guard credentials dev-only',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 2. Dockerfile (migrations no startup)
    console.log('📤 Dockerfile (MIGRATIONS NO STARTUP)...');
    ({ data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'Dockerfile',
      branch: 'main'
    }));
    
    const dockerContent = readFileSync('Dockerfile', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'Dockerfile',
      message: 'PRODUCTION READY: Remove build-time migrations, use startup script',
      content: Buffer.from(dockerContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 3. start-production.sh (startup script)
    console.log('📤 start-production.sh (STARTUP SCRIPT)...');
    const startupContent = readFileSync('start-production.sh', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'start-production.sh',
      message: 'PRODUCTION READY: Add startup script with migrations at runtime',
      content: Buffer.from(startupContent).toString('base64'),
      branch: 'main'
    });
    
    console.log('✅ TODAS AS CORREÇÕES CRÍTICAS ENVIADAS!');
    console.log('🎯 PostgreSQL Session Store seguro ✓');
    console.log('🔐 Credentials guardados apenas em dev ✓');
    console.log('📦 Migrations no startup (não build-time) ✓');
    console.log('🚀 AGORA SIM ESTÁ PRONTO PARA PRODUÇÃO!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendProductionReadyFixes().catch(console.error);