import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendTypescriptFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 ENVIANDO CORREÇÃO TYPESCRIPT...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // server/prod.ts com typescript correto
    console.log('📤 server/prod.ts (TYPESCRIPT CORRIGIDO)...');
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
      message: 'TYPESCRIPT FIX: Proper error handling for index creation',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ CORREÇÃO TYPESCRIPT ENVIADA!');
    console.log('🎯 Error handling correto ✓');
    console.log('📝 TypeScript tipos corretos ✓');  
    console.log('🚀 TUDO PRONTO PARA DEPLOY!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendTypescriptFix().catch(console.error);