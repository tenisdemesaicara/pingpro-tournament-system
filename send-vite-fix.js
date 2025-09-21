import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendViteFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 ENVIANDO CORREÇÃO DEFINITIVA - VITE FIX...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // 1. Enviar novo server/static.ts
    console.log('📤 server/static.ts...');
    const staticContent = readFileSync('server/static.ts', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'server/static.ts',
      message: 'Add server/static.ts - separate vite from production code',
      content: Buffer.from(staticContent).toString('base64'),
      branch: 'main'
    });
    
    // 2. Atualizar server/index.ts
    console.log('📤 server/index.ts...');
    const { data: currentIndex } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'server/index.ts',
      branch: 'main'
    });
    
    const indexContent = readFileSync('server/index.ts', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'server/index.ts',
      message: 'Fix vite import - use dynamic import in dev only',
      content: Buffer.from(indexContent).toString('base64'),
      sha: currentIndex.sha,
      branch: 'main'
    });
    
    console.log('✅ CORREÇÃO ENVIADA!');
    console.log('🎯 Vite não será mais bundled em produção!');
    console.log('🚀 DEPLOY FINAL DEVE FUNCIONAR!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendViteFix().catch(console.error);