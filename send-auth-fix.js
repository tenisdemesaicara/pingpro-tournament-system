import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendAuthFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 Enviando correção do auth-context...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Enviar auth-context corrigido
    const content = readFileSync('client/src/context/auth-context.tsx', 'utf8');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'client/src/context/auth-context.tsx',
      message: 'Fix auth-context infinite loop - simplify public routes logic',
      content: Buffer.from(content).toString('base64'),
      branch: 'main'
    });
    
    console.log('✅ Correção enviada! Loop infinito resolvido.');
    console.log('🚀 Faça novo deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendAuthFix().catch(console.error);