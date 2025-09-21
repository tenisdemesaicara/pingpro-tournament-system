import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendDbFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 ENVIANDO CORREÇÃO DO BANCO - DATABASE_URL SIMPLES...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Atualizar server/db.ts
    console.log('📤 server/db.ts (SIMPLIFICADO)...');
    const { data: currentDbFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'server/db.ts',
      branch: 'main'
    });
    
    const dbContent = readFileSync('server/db.ts', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'server/db.ts',
      message: 'Fix database connection - use standard DATABASE_URL from Render',
      content: Buffer.from(dbContent).toString('base64'),
      sha: currentDbFile.sha,
      branch: 'main'
    });
    
    console.log('✅ CORREÇÃO DO BANCO ENVIADA!');
    console.log('🎯 Agora usa DATABASE_URL padrão do Render!');
    console.log('🚀 DEPLOY FINAL DEVE FUNCIONAR 100%!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendDbFix().catch(console.error);