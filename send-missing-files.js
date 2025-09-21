import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync, existsSync } from 'fs';

async function sendMissingFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('📤 Enviando arquivos faltando...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // postcss.config.js
    const postcssContent = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
    
    console.log('📤 Enviando postcss.config.js...');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'postcss.config.js',
      message: 'Add postcss.config.js for Tailwind CSS build',
      content: Buffer.from(postcssContent).toString('base64'),
      branch: 'main'
    });
    
    // Enviar mais arquivos de configuração importantes
    const configFiles = [
      'client/src/index.css',
      'client/src/lib/utils.ts',
      'client/postcss.config.js'
    ];
    
    for (const filePath of configFiles) {
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          console.log(`📤 Enviando ${filePath}...`);
          
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: `Add ${filePath} for build`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main'
          });
          
          // Pausa pequena entre uploads
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          console.log(`⚠️ ${filePath}: ${e.message}`);
        }
      }
    }
    
    console.log('✅ Arquivos enviados!');
    console.log('🚀 Agora teste novo deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendMissingFiles().catch(console.error);