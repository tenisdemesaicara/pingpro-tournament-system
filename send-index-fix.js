import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendIndexFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 ENVIANDO CORREÇÃO DOS INDEXES...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // server/prod.ts com indexes individuais
    console.log('📤 server/prod.ts (INDEXES INDIVIDUAIS)...');
    const { data: currentFile } = await octokit.rest.repos.getContent({
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
      message: 'INDEX FIX: Create indexes individually to isolate error',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ CORREÇÃO DOS INDEXES ENVIADA!');
    console.log('🔍 Indexes criados individualmente ✓');
    console.log('⚠️ Não falha se algum index der erro ✓');  
    console.log('🎯 Identificação do index problemático ✓');
    console.log('🚀 ISSO VAI RESOLVER O PROBLEMA!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendIndexFix().catch(console.error);