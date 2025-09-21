import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

async function uploadFilesToGitHub() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log(`✅ Conectado como: ${user.data.login}`);
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Arquivos importantes para upload
    const importantFiles = [
      'package.json',
      'vite.config.ts',
      'tailwind.config.ts',
      'tsconfig.json',
      'drizzle.config.ts',
      'render.yaml',
      'Dockerfile',
      '.github/workflows/deploy.yml',
      'build.sh',
      'start.sh',
      'shared/schema.ts',
      'server/index.ts',
      'server/routes.ts',
      'server/storage.ts',
      'server/db.ts',
      'client/index.html',
      'client/.env.local',
      'client/src/App.tsx',
      'client/src/main.tsx'
    ];
    
    console.log('📁 Fazendo upload dos arquivos principais...');
    
    for (const filePath of importantFiles) {
      try {
        if (statSync(filePath).isFile()) {
          const content = readFileSync(filePath, 'utf8');
          const contentEncoded = Buffer.from(content).toString('base64');
          
          console.log(`📤 Upload: ${filePath}`);
          
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: `Add ${filePath}`,
            content: contentEncoded,
            branch: 'main'
          });
          
          // Pequena pausa entre uploads
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`⚠️ Erro no arquivo ${filePath}:`, error.message);
        }
      }
    }
    
    console.log('✅ Upload concluído!');
    console.log(`🌐 Repositório: https://github.com/${owner}/${repo}`);
    console.log('🚀 Pronto para configurar Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
    return false;
  }
}

uploadFilesToGitHub().catch(console.error);