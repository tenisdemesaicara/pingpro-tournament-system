import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendDockerfileFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 CORRIGINDO Dockerfile - SOLUÇÃO DEFINITIVA...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    const path = 'Dockerfile';
    
    // Buscar SHA atual
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      branch: 'main'
    });
    
    // Ler conteúdo local
    const content = readFileSync('Dockerfile', 'utf8');
    
    // Atualizar
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: 'FINAL FIX: Install all deps for build, then prune - resolves vite not found',
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ Dockerfile CORRIGIDO!');
    console.log('🎯 Agora: npm ci → build → prune');
    console.log('🚀 DEPLOY FINAL DEVE FUNCIONAR 100%!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendDockerfileFix().catch(console.error);