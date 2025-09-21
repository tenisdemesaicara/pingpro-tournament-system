import { getUncachableGitHubClient } from './github-client.js';

async function checkMissingFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 Verificando arquivos faltando no GitHub...');
    
    // Arquivos críticos para o build
    const criticalFiles = [
      'vite.config.ts',
      'tailwind.config.ts', 
      'tsconfig.json',
      'postcss.config.js',
      'client/src/main.tsx',
      'client/src/App.tsx',
      'client/index.html',
      'shared/schema.ts'
    ];
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    for (const filePath of criticalFiles) {
      try {
        await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          branch: 'main'
        });
        console.log(`✅ ${filePath}`);
      } catch (e) {
        if (e.status === 404) {
          console.log(`❌ FALTANDO: ${filePath}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

checkMissingFiles().catch(console.error);