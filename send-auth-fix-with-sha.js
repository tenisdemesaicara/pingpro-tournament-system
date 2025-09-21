import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendAuthFixWithSha() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 Enviando correção do auth-context com SHA...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    const path = 'client/src/context/auth-context.tsx';
    
    // Primeiro, buscar o SHA do arquivo atual
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      branch: 'main'
    });
    
    // Ler conteúdo local
    const content = readFileSync('client/src/context/auth-context.tsx', 'utf8');
    
    // Atualizar com SHA
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: 'Fix auth-context infinite loop - simplify public routes logic',
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ Correção enviada com SHA!');
    console.log('🚀 Faça novo deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendAuthFixWithSha().catch(console.error);