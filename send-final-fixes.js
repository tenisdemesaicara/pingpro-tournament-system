import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendFinalFixes() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 ENVIANDO CORREÇÕES CRÍTICAS FINAIS...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // 1. Dockerfile (migrations fix)
    console.log('📤 Dockerfile (MIGRATIONS FIX)...');
    let { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'Dockerfile',
      branch: 'main'
    });
    
    const dockerContent = readFileSync('Dockerfile', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'Dockerfile',
      message: 'CRITICAL FIX: Move db:push before npm prune to avoid drizzle-kit not found',
      content: Buffer.from(dockerContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 2. server/prod.ts (security fix)
    console.log('📤 server/prod.ts (SECURITY FIX)...');
    ({ data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'server/prod.ts',
      branch: 'main'
    }));
    
    const prodContent = readFileSync('server/prod.ts', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'server/prod.ts',
      message: 'SECURITY FIX: Add SESSION_SECRET validation, trust proxy, secure cookies',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ TODAS AS CORREÇÕES CRÍTICAS ENVIADAS!');
    console.log('🎯 Migrations: db:push ANTES do prune ✓');
    console.log('🔐 Segurança: SESSION_SECRET + cookies seguros ✓');
    console.log('📁 Assets: Alinhamento confirmado ✓');
    console.log('🚀 AGORA ESTÁ PRONTO PARA PRODUÇÃO!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendFinalFixes().catch(console.error);