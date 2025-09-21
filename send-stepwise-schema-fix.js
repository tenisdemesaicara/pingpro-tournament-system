import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendStepwiseSchemaFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 ENVIANDO CORREÇÃO COM QUERIES DIVIDIDAS...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // server/prod.ts com queries em etapas
    console.log('📤 server/prod.ts (QUERIES DIVIDIDAS EM ETAPAS)...');
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
      message: 'STEPWISE SQL: Divide schema queries to isolate errors',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ CORREÇÃO COM QUERIES DIVIDIDAS ENVIADA!');
    console.log('🔍 Logs detalhados para cada etapa ✓');
    console.log('🎯 Identificação precisa de erros ✓');  
    console.log('💾 Schema aplicado em passos ✓');
    console.log('🚀 AGORA VAI IDENTIFICAR O ERRO EXATO!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendStepwiseSchemaFix().catch(console.error);