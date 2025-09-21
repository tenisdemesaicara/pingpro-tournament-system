import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendDetailedLoggingFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 ENVIANDO LOGS DETALHADOS PARA DIAGNOSTICAR...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // server/prod.ts com logs detalhados
    console.log('📤 server/prod.ts (LOGS DETALHADOS + ERROR HANDLING)...');
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
      message: 'DIAGNOSTIC: Add detailed startup logs to identify Render issue',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ LOGS DETALHADOS ENVIADOS!');
    console.log('🔍 Startup logs detalhados ✓');
    console.log('🆘 Emergency server se der erro ✓');  
    console.log('💡 Health check endpoint ✓');
    console.log('🚀 AGORA VAI MOSTRAR ONDE ESTÁ TRAVANDO!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendDetailedLoggingFix().catch(console.error);