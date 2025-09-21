import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendAppFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 Enviando correção do App.tsx...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    const path = 'client/src/App.tsx';
    
    // Buscar SHA atual
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      branch: 'main'
    });
    
    // Ler conteúdo local
    const content = readFileSync('client/src/App.tsx', 'utf8');
    
    // Atualizar
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: 'Fix TypeScript errors - remove unnecessary id props',
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ App.tsx corrigido enviado!');
    console.log('🚀 Faça novo deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendAppFix().catch(console.error);