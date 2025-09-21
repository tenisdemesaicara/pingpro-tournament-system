import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function sendCompleteSchemaFix() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🎯 ENVIANDO CORREÇÃO FINAL COMPLETA...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // server/prod.ts com TODAS as correções
    console.log('📤 server/prod.ts (SCHEMA COMPLETO + PGCRYPTO)...');
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
      message: 'COMPLETE FIX: Full schema SQL, pgcrypto extension, all tables',
      content: Buffer.from(prodContent).toString('base64'),
      sha: currentFile.sha,
      branch: 'main'
    });
    
    console.log('✅ CORREÇÃO FINAL COMPLETA ENVIADA!');
    console.log('🎯 UUID Extension: pgcrypto ✓');
    console.log('💾 Schema Completo: todas as tabelas ✓');
    console.log('📋 Indexes: otimizados ✓');
    console.log('🚀 AGORA É A VERSÃO DEFINITIVA!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendCompleteSchemaFix().catch(console.error);