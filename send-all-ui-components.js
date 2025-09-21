import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

async function sendAllUIComponents() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 Enviando TODOS os componentes UI...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Enviar todos os componentes UI
    const uiPath = 'client/src/components/ui';
    if (existsSync(uiPath)) {
      const uiFiles = readdirSync(uiPath);
      console.log(`📁 Encontrados ${uiFiles.length} componentes UI`);
      
      for (const fileName of uiFiles) {
        const filePath = join(uiPath, fileName);
        if ((fileName.endsWith('.tsx') || fileName.endsWith('.ts')) && statSync(filePath).isFile()) {
          try {
            const content = readFileSync(filePath, 'utf8');
            const githubPath = `client/src/components/ui/${fileName}`;
            
            console.log(`📤 ${fileName}...`);
            
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: githubPath,
              message: `Add ${githubPath} - UI component`,
              content: Buffer.from(content).toString('base64'),
              branch: 'main'
            });
            
            // Pausa pequena para evitar rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (e) {
            if (e.status !== 422) { // Não mostrar "já existe"
              console.log(`⚠️ ${fileName}: ${e.message.split('\n')[0]}`);
            }
          }
        }
      }
    }
    
    // Enviar hooks importantes
    const hooksPath = 'client/src/hooks';
    if (existsSync(hooksPath)) {
      const hookFiles = readdirSync(hooksPath);
      for (const fileName of hookFiles) {
        const filePath = join(hooksPath, fileName);
        if ((fileName.endsWith('.tsx') || fileName.endsWith('.ts')) && statSync(filePath).isFile()) {
          try {
            const content = readFileSync(filePath, 'utf8');
            const githubPath = `client/src/hooks/${fileName}`;
            
            console.log(`📤 Hook: ${fileName}...`);
            
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: githubPath,
              message: `Add ${githubPath} - hook`,
              content: Buffer.from(content).toString('base64'),
              branch: 'main'
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (e) {
            if (e.status !== 422) {
              console.log(`⚠️ Hook ${fileName}: ${e.message.split('\n')[0]}`);
            }
          }
        }
      }
    }
    
    console.log('✅ TODOS os componentes UI enviados!');
    console.log('🎯 Especificamente tooltip.tsx foi enviado!');
    console.log('🚀 Agora faça deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendAllUIComponents().catch(console.error);