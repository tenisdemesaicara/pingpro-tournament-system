import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendAuthContext() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 Enviando auth-context.tsx...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Enviar auth-context
    const content = readFileSync('client/src/context/auth-context.tsx', 'utf8');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'client/src/context/auth-context.tsx',
      message: 'Add client/src/context/auth-context.tsx',
      content: Buffer.from(content).toString('base64'),
      branch: 'main'
    });
    
    console.log('✅ auth-context.tsx enviado!');
    console.log('🚀 Faça deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendAuthContext().catch(console.error);