import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendNewStrategy() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔥 ENVIANDO NOVA ESTRATÉGIA - SERVIDOR DE PRODUÇÃO SEPARADO...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // 1. Novo servidor de produção
    console.log('📤 server/prod.ts (NOVO)...');
    const prodContent = readFileSync('server/prod.ts', 'utf8');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'server/prod.ts',
      message: 'NEW STRATEGY: Add dedicated production server without vite',
      content: Buffer.from(prodContent).toString('base64'),
      branch: 'main'
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 2. Dockerfile atualizado
    console.log('📤 Dockerfile (ATUALIZADO)...');
    const { data: currentDockerfile } = await octokit.rest.repos.getContent({
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
      message: 'NEW STRATEGY: Build separate prod server, use node dist/prod.js',
      content: Buffer.from(dockerContent).toString('base64'),
      sha: currentDockerfile.sha,
      branch: 'main'
    });
    
    console.log('✅ NOVA ESTRATÉGIA ENVIADA!');
    console.log('🎯 Servidor de produção SEM VITE!');
    console.log('🚀 ESTE DEPLOY VAI FUNCIONAR!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendNewStrategy().catch(console.error);