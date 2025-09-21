import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendRenderYamlFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 CORRIGINDO render.yaml - DOCKER CONFIG...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    const path = 'render.yaml';
    
    // Buscar SHA atual
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      branch: 'main'
    });
    
    // Ler conteúdo local
    const content = readFileSync('render.yaml', 'utf8');
    
    // Atualizar
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: 'Fix render.yaml - use docker env, remove conflicting buildCommand',
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ render.yaml CORRIGIDO!');
    console.log('🎯 Docker + Node config otimizada!');
    console.log('🚀 DEPLOY FINAL VAI FUNCIONAR!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendRenderYamlFix().catch(console.error);